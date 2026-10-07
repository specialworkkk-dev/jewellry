import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectToDatabase from '@/lib/mongoose';
import Advertisement from '@/models/Advertisement';
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
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid advertisement' }, { status: 400 });

    await connectToDatabase();
    const ad = await Advertisement.findOneAndDelete({ _id: id, shopId: tenant.shopId }).lean();
    if (!ad) return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });

    publishShopContentChange({ shopId: tenant.shopId, slug: tenant.shop.slug }, id);
    if (ad.imageUrl) await deleteShopObjects(tenant.shopId, [ad.imageUrl]);
    return NextResponse.json({ message: 'Advertisement deleted' });
  } catch (error: unknown) {
    console.error('Delete advertisement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Toggle: { isActive: boolean }. Activating needs a live plan and an unexpired ad. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Invalid advertisement' }, { status: 400 });
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body) || typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be true or false' }, { status: 400 });
    }

    await connectToDatabase();
    const ad = await Advertisement.findOne({ _id: id, shopId: tenant.shopId });
    if (!ad) return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });

    if (body.isActive) {
      const block = getPlanBlock(tenant.shop);
      if (block) return NextResponse.json({ error: block.error }, { status: block.status });
      if (ad.validUntil && new Date(ad.validUntil).getTime() <= Date.now()) {
        return NextResponse.json({ error: 'This advertisement has expired. Create a new one.' }, { status: 400 });
      }
      if (ad.type === 'GOLD_RATE') {
        await Advertisement.updateMany(
          { shopId: new Types.ObjectId(tenant.shopId), type: 'GOLD_RATE', isActive: true, _id: { $ne: ad._id } },
          { $set: { isActive: false } },
        );
      }
    }
    ad.isActive = body.isActive;
    await ad.save();
    publishShopContentChange({ shopId: tenant.shopId, slug: tenant.shop.slug }, id);
    return NextResponse.json({ message: 'Advertisement updated', isActive: ad.isActive });
  } catch (error: unknown) {
    console.error('Update advertisement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
