import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Category from '@/models/Category';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const shopId = session.user.shopId;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Fetch system default categories + shop-specific categories
    const categories = await Category.find({
      $or: [
        { isSystemDefault: true },
        { shopId: shopId }
      ]
    }).sort({ name: 1 });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
