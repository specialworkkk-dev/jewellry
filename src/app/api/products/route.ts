import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Product from '@/models/Product';
import Shop from '@/models/Shop';
import { Types } from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = (session.user as any).shopId;
    const body = await req.json();

    // Basic Validation
    if (!body.name || !body.sku || !body.categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Enforce Product Limits
    const productCount = await Product.countDocuments({ shopId });
    if (productCount >= (shop.maxProducts || 50)) {
      return NextResponse.json({ error: `You have reached your maximum product limit of ${shop.maxProducts}. Please upgrade your plan.` }, { status: 403 });
    }

    // Check SKU uniqueness per shop
    const existingSku = await Product.findOne({ shopId, sku: body.sku });
    if (existingSku) {
      return NextResponse.json({ error: 'SKU already exists for this shop' }, { status: 400 });
    }

    const newProduct = new Product({
      ...body,
      shopId: new Types.ObjectId(shopId),
      categoryId: new Types.ObjectId(body.categoryId),
    });

    await newProduct.save();

    return NextResponse.json({ message: 'Product created successfully', product: newProduct }, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate key error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
