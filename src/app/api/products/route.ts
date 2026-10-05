import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Product from '@/models/Product';
import Shop from '@/models/Shop';
import { Types } from 'mongoose';
import Category from '@/models/Category';
import { cleanString, isDuplicateKeyError, isObjectId, isRecord, safeExternalUrl } from '@/lib/validation';

const PRICE_TYPES = new Set(['FIXED_PRICE', 'STARTING_FROM', 'PRICE_ON_REQUEST', 'CONTACT_FOR_PRICE']);
const GOLD_PURITIES = new Set(['14K', '18K', '22K', '24K']);

function optionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const body: unknown = await req.json();
    if (!shopId || !isRecord(body)) {
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

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

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
    const priceType = typeof body.priceType === 'string' && PRICE_TYPES.has(body.priceType)
      ? body.priceType
      : 'PRICE_ON_REQUEST';
    const goldPurity = typeof body.goldPurity === 'string' && GOLD_PURITIES.has(body.goldPurity)
      ? body.goldPurity
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
      price: optionalNumber(body.price),
      originalPrice: optionalNumber(body.originalPrice),
      goldPurity,
      goldWeight: optionalNumber(body.goldWeight),
      diamondWeight: optionalNumber(body.diamondWeight),
      stoneType: cleanString(body.stoneType, 120),
      stoneWeight: optionalNumber(body.stoneWeight),
      makingCharges: optionalNumber(body.makingCharges),
      isPublished: body.isPublished === true,
      isFeatured: body.isFeatured === true,
      isNewArrival: body.isNewArrival === true,
      isBestseller: body.isBestseller === true,
      isBridalCollection: body.isBridalCollection === true,
    });

    await newProduct.save();

    return NextResponse.json({ message: 'Product created successfully', product: newProduct }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create product error:', error);
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'Duplicate key error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
