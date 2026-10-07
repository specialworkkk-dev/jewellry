import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import connectToDatabase from '@/lib/mongoose';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { cleanString, isDuplicateKeyError, isObjectId, isRecord, safeExternalUrl } from '@/lib/validation';
import { scheduleShopEvent } from '@/lib/realtime';
import { calculateDiscountedAmount, type DiscountType } from '@/lib/product-pricing';
import { invalidatePublicStoreCache } from '@/lib/public-store-cache';
import { getVerifiedOwnerTenant } from '@/lib/tenant';
import { getPlanReminderStatus } from '@/lib/plan';
import { deleteShopObjects } from '@/lib/r2';

const PRICE_TYPES = new Set(['FIXED_PRICE', 'STARTING_FROM', 'PRICE_ON_REQUEST', 'CONTACT_FOR_PRICE']);
const PRICED_TYPES = new Set(['FIXED_PRICE', 'STARTING_FROM']);
const GOLD_PURITIES = new Set(['14K', '18K', '22K', '24K']);
const DISCOUNT_TYPES = new Set<DiscountType>(['PERCENTAGE', 'FIXED_AMOUNT']);

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function isBlank(value: unknown) {
  return value === '' || value === null || value === undefined;
}

/** Returns undefined when blank, NaN when invalid, else the non-negative number. */
function parseOptional(value: unknown) {
  if (isBlank(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

function startOfTodayInIndia() {
  const offset = 330 * 60 * 1000;
  const now = new Date(Date.now() + offset);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - offset);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return fail('Unauthorized', 401);
    const { shopId, shop } = tenant;
    const { id } = await params;
    if (!isObjectId(id)) return fail('Invalid product');
    if (!shop.isActive) return fail('This shop is inactive', 403);
    if (shop.planEndsAt && Number(shop.planPrice ?? 0) > 0 && getPlanReminderStatus(new Date(shop.planEndsAt)).expired) {
      return fail('Your plan has expired. Renew to edit products.', 403);
    }

    const body: unknown = await req.json();
    if (!isRecord(body)) return fail('Invalid request payload');

    await connectToDatabase();
    const product = await Product.findOne({ _id: id, shopId });
    if (!product) return fail('Product not found', 404);

    const name = cleanString(body.name, 160);
    const sku = cleanString(body.sku, 80).toUpperCase();
    if (!name || !sku || !isObjectId(body.categoryId)) return fail('Missing required fields');

    const category = await Category.findOne({
      _id: body.categoryId,
      $or: [{ isSystemDefault: true }, { shopId: shop._id }],
    }).select('_id');
    if (!category) return fail('Invalid category');

    if (sku !== product.sku) {
      const existingSku = await Product.findOne({ shopId, sku, _id: { $ne: product._id } }).select('_id');
      if (existingSku) return fail('SKU already exists for this shop');
    }

    const images = Array.isArray(body.images) ? body.images.slice(0, 12).map(safeExternalUrl).filter(Boolean) : [];
    const videos = Array.isArray(body.videos) ? body.videos.slice(0, 4).map(safeExternalUrl).filter(Boolean) : [];
    const existingVideos = new Set(product.videos ?? []);
    const addedVideos = videos.filter((url) => !existingVideos.has(url));
    if (addedVideos.length > 0) {
      if (shop.videoUploadsEnabled !== true) return fail('Video uploads are not enabled for this shop', 403);
      const publicBaseUrl = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, '');
      const expectedPrefix = publicBaseUrl ? `${publicBaseUrl}/shops/${shopId}/products/` : '';
      if (!expectedPrefix || addedVideos.some((url) => !url.startsWith(expectedPrefix))) {
        return fail('Invalid product video source');
      }
      const maxVideosPerDay = Math.min(20, Math.max(1, Number(shop.maxVideosPerDay ?? 2)));
      const [dailyUsage] = await Product.aggregate<{ count: number }>([
        { $match: { shopId: new Types.ObjectId(shopId), createdAt: { $gte: startOfTodayInIndia() } } },
        { $project: { count: { $size: { $ifNull: ['$videos', []] } } } },
        { $group: { _id: null, count: { $sum: '$count' } } },
      ]);
      if ((dailyUsage?.count ?? 0) + addedVideos.length > maxVideosPerDay) {
        return fail(`Daily video limit reached. This shop can publish ${maxVideosPerDay} video${maxVideosPerDay === 1 ? '' : 's'} per day.`, 403);
      }
    }

    const priceType = typeof body.priceType === 'string' && PRICE_TYPES.has(body.priceType) ? body.priceType : 'PRICE_ON_REQUEST';
    const goldPurity = typeof body.goldPurity === 'string' && GOLD_PURITIES.has(body.goldPurity) ? body.goldPurity : undefined;
    const discountType = typeof body.discountType === 'string' && DISCOUNT_TYPES.has(body.discountType as DiscountType)
      ? body.discountType as DiscountType : undefined;
    const makingChargesDiscountType = typeof body.makingChargesDiscountType === 'string'
      && DISCOUNT_TYPES.has(body.makingChargesDiscountType as DiscountType)
      ? body.makingChargesDiscountType as DiscountType : undefined;

    const enteredPriceRaw = parseOptional(body.price);
    const makingCharges = parseOptional(body.makingCharges);
    const discountValueRaw = parseOptional(body.discountValue);
    const makingDiscountRaw = parseOptional(body.makingChargesDiscountValue);
    const goldWeight = parseOptional(body.goldWeight);
    const diamondWeight = parseOptional(body.diamondWeight);
    const stoneWeight = parseOptional(body.stoneWeight);
    if (Number.isNaN(enteredPriceRaw)) return fail('Product price must be a positive number');
    if (Number.isNaN(makingCharges)) return fail('Making charges must be a positive number');
    if (Number.isNaN(discountValueRaw)) return fail('Main discount must be a positive number');
    if (Number.isNaN(makingDiscountRaw)) return fail('Making-charge discount must be a positive number');
    if (Number.isNaN(goldWeight) || Number.isNaN(diamondWeight) || Number.isNaN(stoneWeight)) {
      return fail('Weights must be positive numbers');
    }

    // On-request types never store a price or main discount.
    const priced = PRICED_TYPES.has(priceType);
    const enteredPrice = priced ? enteredPriceRaw : undefined;
    const discountValue = priced ? (discountValueRaw ?? 0) : 0;
    const makingChargesDiscountValue = makingDiscountRaw ?? 0;

    if (priced && (!enteredPrice || enteredPrice <= 0)) return fail('Enter a price for fixed or starting-from pricing');
    if (discountValue > 0 && !discountType) return fail('Select a valid main discount type');
    if (makingChargesDiscountValue > 0 && !makingChargesDiscountType) return fail('Select a valid making-charge discount type');
    if (discountValue > 0 && (!enteredPrice || enteredPrice <= 0)) return fail('Enter a product price before adding a main discount');
    if (discountType === 'PERCENTAGE' && discountValue > 100) return fail('Main percentage discount cannot exceed 100%');
    if (discountType === 'FIXED_AMOUNT' && enteredPrice !== undefined && discountValue > enteredPrice) {
      return fail('Main fixed discount cannot exceed the product price');
    }
    if (makingChargesDiscountValue > 0 && (!makingCharges || makingCharges <= 0)) {
      return fail('Enter making charges before adding a making-charge discount');
    }
    if (makingChargesDiscountType === 'PERCENTAGE' && makingChargesDiscountValue > 100) {
      return fail('Making-charge percentage discount cannot exceed 100%');
    }
    if (makingChargesDiscountType === 'FIXED_AMOUNT' && makingCharges !== undefined && makingChargesDiscountValue > makingCharges) {
      return fail('Making-charge fixed discount cannot exceed making charges');
    }

    const hasMainDiscount = Boolean(discountType && discountValue > 0 && enteredPrice !== undefined);
    const finalPrice = enteredPrice === undefined ? undefined : calculateDiscountedAmount(enteredPrice, discountType, discountValue);
    const discountPercentage = hasMainDiscount && enteredPrice
      ? discountType === 'PERCENTAGE' ? discountValue : Math.round((discountValue / enteredPrice * 100) * 100) / 100
      : undefined;

    const removedMedia = [...(product.images ?? []), ...(product.videos ?? [])]
      .filter((url) => !images.includes(url) && !videos.includes(url));

    const set: Record<string, unknown> = {
      name, sku, categoryId: category._id,
      description: cleanString(body.description, 5000),
      images, videos, priceType,
      stoneType: cleanString(body.stoneType, 120),
      makingChargesDiscountType: makingChargesDiscountValue > 0 ? makingChargesDiscountType : undefined,
      makingChargesDiscountValue: makingChargesDiscountValue > 0 ? makingChargesDiscountValue : undefined,
    };
    const unset: Record<string, ''> = {};
    const assign = (key: string, value: unknown) => {
      if (value === undefined) unset[key] = ''; else set[key] = value;
      if (value === undefined) delete set[key];
    };
    assign('price', finalPrice);
    assign('originalPrice', hasMainDiscount ? enteredPrice : undefined);
    assign('discountPercentage', discountPercentage);
    assign('discountType', hasMainDiscount ? discountType : undefined);
    assign('discountValue', hasMainDiscount ? discountValue : undefined);
    assign('goldPurity', goldPurity);
    assign('goldWeight', goldWeight);
    assign('diamondWeight', diamondWeight);
    assign('stoneWeight', stoneWeight);
    assign('makingCharges', makingCharges);
    assign('makingChargesDiscountType', set.makingChargesDiscountType);
    assign('makingChargesDiscountValue', set.makingChargesDiscountValue);
    if (typeof body.isPublished === 'boolean') set.isPublished = body.isPublished;

    await Product.updateOne(
      { _id: product._id, shopId },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { runValidators: true },
    );

    if (removedMedia.length > 0) await deleteShopObjects(shopId, removedMedia);
    revalidatePath('/dashboard/products', 'page');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/shop/[slug]', 'page');
    invalidatePublicStoreCache({ shopId, slug: shop.slug });
    scheduleShopEvent(shopId, 'product.updated', 'both', id);

    return NextResponse.json({ message: 'Product updated successfully' });
  } catch (error: unknown) {
    console.error('Update product error:', error);
    if (isDuplicateKeyError(error)) return fail('SKU already exists for this shop');
    return fail('Internal Server Error', 500);
  }
}
