import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Category from '@/models/Category';
import { getVerifiedOwnerTenant } from '@/lib/tenant';

export async function GET() {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const { shopId } = tenant;

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
