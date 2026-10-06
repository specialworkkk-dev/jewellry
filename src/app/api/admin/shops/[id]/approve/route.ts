import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Shop from '@/models/Shop';
import { isObjectId } from '@/lib/validation';
import { invalidatePublicStoreCache } from '@/lib/public-store-cache';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    const allowedAdminRoles = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN']);
    const activeRole = session?.user?.role ?? '';

    if (!session || !allowedAdminRoles.has(activeRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await context.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: 'Invalid shop' }, { status: 400 });
    }
    const shop = await Shop.findById(id);
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    shop.isApproved = true;
    await shop.save();
    invalidatePublicStoreCache();

    return NextResponse.json({ message: 'Shop approved successfully' });
  } catch (error) {
    console.error('Approve shop error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
