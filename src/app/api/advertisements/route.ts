import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Advertisement from '@/models/Advertisement';
import { Types } from 'mongoose';
import { cleanString, isRecord, safeExternalUrl } from '@/lib/validation';
import { getVerifiedOwnerTenant } from '@/lib/tenant';

const AD_TYPES = new Set(['HERO_BANNER', 'PROMO_STRIP', 'GOLD_RATE']);

export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopId } = tenant;
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const title = cleanString(body.title, 160);
    const message = cleanString(body.message, 1000);
    const type = typeof body.type === 'string' && AD_TYPES.has(body.type) ? body.type : 'PROMO_STRIP';

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Special logic: If they are posting a new GOLD_RATE, deactivate older gold rates automatically
    if (type === 'GOLD_RATE') {
      await Advertisement.updateMany(
        { shopId: new Types.ObjectId(shopId), type: 'GOLD_RATE', isActive: true },
        { $set: { isActive: false } }
      );
    }

    const validUntil = typeof body.validUntil === 'string' ? new Date(body.validUntil) : undefined;
    const newAd = new Advertisement({
      shopId: new Types.ObjectId(shopId),
      title,
      message,
      type,
      imageUrl: safeExternalUrl(body.imageUrl) || undefined,
      linkUrl: safeExternalUrl(body.linkUrl) || undefined,
      isActive: body.isActive !== false,
      validUntil: validUntil && !Number.isNaN(validUntil.getTime()) ? validUntil : undefined,
    });

    await newAd.save();

    return NextResponse.json({ message: 'Advertisement created successfully', ad: newAd }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create advertisement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
