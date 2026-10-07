import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Post from '@/models/Post';
import { isObjectId, isRecord } from '@/lib/validation';
import { getVerifiedOwnerTenant } from '@/lib/tenant';
import { getPlanBlock } from '@/lib/plan';
import { publishShopContentChange } from '@/lib/public-store-cache';
import { deleteShopObjects } from '@/lib/r2';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid post' }, { status: 400 });

    await connectToDatabase();
    const post = await Post.findOneAndDelete({ _id: id, shopId: tenant.shopId }).lean();
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    publishShopContentChange({ shopId: tenant.shopId, slug: tenant.shop.slug }, id);
    await deleteShopObjects(tenant.shopId, post.mediaUrls ?? []);
    return NextResponse.json({ message: 'Post deleted' });
  } catch (error: unknown) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Toggle visibility: { isPublished: boolean }. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid post' }, { status: 400 });
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body) || typeof body.isPublished !== 'boolean') {
      return NextResponse.json({ error: 'isPublished must be true or false' }, { status: 400 });
    }
    if (body.isPublished) {
      const block = getPlanBlock(tenant.shop);
      if (block) return NextResponse.json({ error: block.error }, { status: block.status });
    }
    await connectToDatabase();
    const result = await Post.updateOne({ _id: id, shopId: tenant.shopId }, { $set: { isPublished: body.isPublished } });
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    publishShopContentChange({ shopId: tenant.shopId, slug: tenant.shop.slug }, id);
    return NextResponse.json({ message: 'Post updated', isPublished: body.isPublished });
  } catch (error: unknown) {
    console.error('Update post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
