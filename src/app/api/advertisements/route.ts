import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Advertisement from '@/models/Advertisement';
import { Types } from 'mongoose';
import { cleanString, isRecord, safeExternalUrl } from '@/lib/validation';
import { getVerifiedOwnerTenant } from '@/lib/tenant';
import { getPlanBlock, isFutureDate, isShopMediaUrl, shopMediaBaseUrl } from '@/lib/plan';

const AD_TYPES = new Set(['HERO_BANNER', 'PROMO_STRIP', 'GOLD_RATE']);

export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopId, shop } = tenant;
    const planBlock = getPlanBlock(shop);
    if (planBlock) {
      return NextResponse.json({ error: planBlock.error }, { status: planBlock.status });
    }
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

    const imageUrl = safeExternalUrl(body.imageUrl);
    if (imageUrl && !isShopMediaUrl(imageUrl, shopMediaBaseUrl(), shopId)) {
      return NextResponse.json({ error: 'Invalid advertisement image source' }, { status: 400 });
    }

    let validUntil: Date | undefined;
    if (typeof body.validUntil === 'string' && body.validUntil.trim()) {
      validUntil = new Date(body.validUntil);
      if (!isFutureDate(validUntil)) {
        return NextResponse.json({ error: 'Valid-until date must be in the future' }, { status: 400 });
      }
    }

    await connectToDatabase();

    // Special logic: If they are posting a new GOLD_RATE, deactivate older gold rates automatically
    if (type === 'GOLD_RATE') {
      await Advertisement.updateMany(
        { shopId: new Types.ObjectId(shopId), type: 'GOLD_RATE', isActive: true },
        { $set: { isActive: false } }
      );
    }

    const newAd = new Advertisement({
      shopId: new Types.ObjectId(shopId),
      title,
      message,
      type,
      imageUrl: imageUrl || undefined,
      linkUrl: safeExternalUrl(body.linkUrl) || undefined,
      isActive: body.isActive !== false,
      validUntil,
    });

    await newAd.save();

    return NextResponse.json({ message: 'Advertisement created successfully', ad: newAd }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create advertisement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
