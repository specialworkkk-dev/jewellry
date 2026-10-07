import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Product from '@/models/Product';
import { Types } from 'mongoose';
import Category from '@/models/Category';
import { cleanString, isDuplicateKeyError, isObjectId, isRecord, safeExternalUrl } from '@/lib/validation';
import { scheduleShopEvent } from '@/lib/realtime';
import { scheduleShopPushNotification } from '@/lib/push-notifications';
import { calculateDiscountedAmount, type DiscountType } from '@/lib/product-pricing';
import { invalidatePublicStoreCache } from '@/lib/public-store-cache';
import { getVerifiedOwnerTenant } from '@/lib/tenant';

const PRICE_TYPES = new Set(['FIXED_PRICE', 'STARTING_FROM', 'PRICE_ON_REQUEST', 'CONTACT_FOR_PRICE']);
const GOLD_PURITIES = new Set(['14K', '18K', '22K', '24K']);
const DISCOUNT_TYPES = new Set<DiscountType>(['PERCENTAGE', 'FIXED_AMOUNT']);

function optionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function startOfTodayInIndia() {
  const indiaOffsetMs = 330 * 60 * 1000;
  const nowInIndia = new Date(Date.now() + indiaOffsetMs);
  const indiaMidnightAsUtc = Date.UTC(
    nowInIndia.getUTCFullYear(),
    nowInIndia.getUTCMonth(),
    nowInIndia.getUTCDate(),
  );
  return new Date(indiaMidnightAsUtc - indiaOffsetMs);
}

export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopId, shop } = tenant;
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const name = cleanString(body.name, 160);
    const sku = cleanString(body.sku, 80).toUpperCase();
    const categoryId = body.categoryId;

    // Basic Validation
    if (!name || !sku || !isObjectId(categoryId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Enforce Product Limits
    if (!shop.isActive) {
      return NextResponse.json({ error: 'This shop is inactive' }, { status: 403 });
    }

    const category = await Category.findOne({
      _id: categoryId,
      $or: [{ isSystemDefault: true }, { shopId: shop._id }],
    }).select('_id');
    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const productCount = await Product.countDocuments({ shopId });
    const maxProducts = shop.maxProducts ?? 50;
    if (productCount >= maxProducts) {
      return NextResponse.json({ error: `You have reached your maximum product limit of ${maxProducts}. Please contact support.` }, { status: 403 });
    }

    // Check SKU uniqueness per shop
    const existingSku = await Product.findOne({ shopId, sku }).select('_id');
    if (existingSku) {
      return NextResponse.json({ error: 'SKU already exists for this shop' }, { status: 400 });
    }

    const images = Array.isArray(body.images)
      ? body.images.slice(0, 12).map(safeExternalUrl).filter(Boolean)
      : [];
    const videos = Array.isArray(body.videos)
      ? body.videos.slice(0, 4).map(safeExternalUrl).filter(Boolean)
      : [];
    if (videos.length > 0) {
      if (shop.videoUploadsEnabled !== true) {
        return NextResponse.json({ error: 'Video uploads are not enabled for this shop' }, { status: 403 });
      }
      const publicBaseUrl = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, '');
      const expectedPrefix = publicBaseUrl ? `${publicBaseUrl}/shops/${shopId}/products/` : '';
      if (!expectedPrefix || videos.some((url) => !url.startsWith(expectedPrefix))) {
        return NextResponse.json({ error: 'Invalid product video source' }, { status: 400 });
      }
      const maxVideosPerDay = Math.min(20, Math.max(1, Number(shop.maxVideosPerDay ?? 2)));
      const [dailyUsage] = await Product.aggregate<{ count: number }>([
        { $match: { shopId: new Types.ObjectId(shopId), createdAt: { $gte: startOfTodayInIndia() } } },
        { $project: { count: { $size: { $ifNull: ['$videos', []] } } } },
        { $group: { _id: null, count: { $sum: '$count' } } },
      ]);
      const usedToday = dailyUsage?.count ?? 0;
      if (usedToday + videos.length > maxVideosPerDay) {
        return NextResponse.json({
          error: `Daily video limit reached. This shop can publish ${maxVideosPerDay} video${maxVideosPerDay === 1 ? '' : 's'} per day.`,
        }, { status: 403 });
      }
    }
    const priceType = typeof body.priceType === 'string' && PRICE_TYPES.has(body.priceType)
      ? body.priceType
      : 'PRICE_ON_REQUEST';
    const goldPurity = typeof body.goldPurity === 'string' && GOLD_PURITIES.has(body.goldPurity)
      ? body.goldPurity
      : undefined;
    const enteredPrice = optionalNumber(body.price);
    const makingCharges = optionalNumber(body.makingCharges);
    const discountType = typeof body.discountType === 'string' && DISCOUNT_TYPES.has(body.discountType as DiscountType)
      ? body.discountType as DiscountType
      : undefined;
    const makingChargesDiscountType = typeof body.makingChargesDiscountType === 'string'
      && DISCOUNT_TYPES.has(body.makingChargesDiscountType as DiscountType)
      ? body.makingChargesDiscountType as DiscountType
      : undefined;
    const discountValue = optionalNumber(body.discountValue) ?? 0;
    const makingChargesDiscountValue = optionalNumber(body.makingChargesDiscountValue) ?? 0;

    if ((body.price !== '' && body.price !== undefined)
      && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
      return NextResponse.json({ error: 'Product price must be a positive number' }, { status: 400 });
    }
    if ((body.makingCharges !== '' && body.makingCharges !== undefined)
      && (!Number.isFinite(Number(body.makingCharges)) || Number(body.makingCharges) < 0)) {
      return NextResponse.json({ error: 'Making charges must be a positive number' }, { status: 400 });
    }
    if ((body.discountValue !== '' && body.discountValue !== undefined)
      && (!Number.isFinite(Number(body.discountValue)) || Number(body.discountValue) < 0)) {
      return NextResponse.json({ error: 'Main discount must be a positive number' }, { status: 400 });
    }
    if ((body.makingChargesDiscountValue !== '' && body.makingChargesDiscountValue !== undefined)
      && (!Number.isFinite(Number(body.makingChargesDiscountValue)) || Number(body.makingChargesDiscountValue) < 0)) {
      return NextResponse.json({ error: 'Making-charge discount must be a positive number' }, { status: 400 });
    }
    if (discountValue > 0 && !discountType) {
      return NextResponse.json({ error: 'Select a valid main discount type' }, { status: 400 });
    }
    if (makingChargesDiscountValue > 0 && !makingChargesDiscountType) {
      return NextResponse.json({ error: 'Select a valid making-charge discount type' }, { status: 400 });
    }
    if (discountValue > 0 && (!enteredPrice || enteredPrice <= 0)) {
      return NextResponse.json({ error: 'Enter a product price before adding a main discount' }, { status: 400 });
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json({ error: 'Main percentage discount cannot exceed 100%' }, { status: 400 });
    }
    if (discountType === 'FIXED_AMOUNT' && enteredPrice !== undefined && discountValue > enteredPrice) {
      return NextResponse.json({ error: 'Main fixed discount cannot exceed the product price' }, { status: 400 });
    }
    if (makingChargesDiscountValue > 0 && (!makingCharges || makingCharges <= 0)) {
      return NextResponse.json({ error: 'Enter making charges before adding a making-charge discount' }, { status: 400 });
    }
    if (makingChargesDiscountType === 'PERCENTAGE' && makingChargesDiscountValue > 100) {
      return NextResponse.json({ error: 'Making-charge percentage discount cannot exceed 100%' }, { status: 400 });
    }
    if (makingChargesDiscountType === 'FIXED_AMOUNT' && makingCharges !== undefined && makingChargesDiscountValue > makingCharges) {
      return NextResponse.json({ error: 'Making-charge fixed discount cannot exceed making charges' }, { status: 400 });
    }

    const hasMainDiscount = Boolean(discountType && discountValue > 0 && enteredPrice !== undefined);
    const finalPrice = enteredPrice === undefined
      ? undefined
      : calculateDiscountedAmount(enteredPrice, discountType, discountValue);
    const discountPercentage = hasMainDiscount && enteredPrice
      ? discountType === 'PERCENTAGE'
        ? discountValue
        : Math.round((discountValue / enteredPrice * 100) * 100) / 100
      : undefined;

    const newProduct = new Product({
      shopId: new Types.ObjectId(shopId),
      name,
      sku,
      categoryId: category._id,
      description: cleanString(body.description, 5000),
      images,
      videos,
      priceType,
      price: finalPrice,
      originalPrice: hasMainDiscount ? enteredPrice : undefined,
      discountPercentage,
      discountType: hasMainDiscount ? discountType : undefined,
      discountValue: hasMainDiscount ? discountValue : undefined,
      goldPurity,
      goldWeight: optionalNumber(body.goldWeight),
      diamondWeight: optionalNumber(body.diamondWeight),
      stoneType: cleanString(body.stoneType, 120),
      stoneWeight: optionalNumber(body.stoneWeight),
      makingCharges,
      makingChargesDiscountType: makingChargesDiscountValue > 0 ? makingChargesDiscountType : undefined,
      makingChargesDiscountValue: makingChargesDiscountValue > 0 ? makingChargesDiscountValue : undefined,
      isPublished: body.isPublished === true,
      isFeatured: body.isFeatured === true,
      isNewArrival: body.isNewArrival === true,
      isBestseller: body.isBestseller === true,
      isBridalCollection: body.isBridalCollection === true,
    });

    await newProduct.save();
    invalidatePublicStoreCache();
    scheduleShopEvent(shopId, 'product.created', newProduct.isPublished ? 'both' : 'owner', newProduct._id.toString());
    if (newProduct.isPublished) {
      scheduleShopPushNotification(shopId, 'product.created', {
        entityId: newProduct._id.toString(),
        productName: newProduct.name,
      });
    }

    return NextResponse.json({ message: 'Product created successfully', product: newProduct }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create product error:', error);
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'Duplicate key error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
