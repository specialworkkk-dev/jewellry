import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Story from '@/models/Story';
import { isObjectId } from '@/lib/validation';
import { getVerifiedOwnerTenant } from '@/lib/tenant';
import { publishShopContentChange } from '@/lib/public-store-cache';
import { deleteShopObjects } from '@/lib/r2';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid story' }, { status: 400 });

    await connectToDatabase();
    const story = await Story.findOneAndDelete({ _id: id, shopId: tenant.shopId }).lean();
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    publishShopContentChange({ shopId: tenant.shopId, slug: tenant.shop.slug }, id);
    await deleteShopObjects(tenant.shopId, [story.mediaUrl]);
    return NextResponse.json({ message: 'Story deleted' });
  } catch (error: unknown) {
    console.error('Delete story error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
