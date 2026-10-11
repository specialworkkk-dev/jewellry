import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Advertisement from '@/models/Advertisement';
import { Types } from 'mongoose';
import { cleanString, isRecord, safeExternalUrl } from '@/lib/validation';
import { publishShopContentChange } from '@/lib/public-store-cache';
import { getVerifiedOwnerTenant } from '@/lib/tenant';
import { getPlanBlock, isFutureDate, isShopMediaUrl, shopMediaBaseUrl } from '@/lib/plan';
import { findUnconfirmedMedia } from '@/lib/media-quota';
import {
  MAX_ACTIVE_FESTIVAL_OFFERS,
  parseDateInput,
  sanitizeFestivalLabel,
  validateFestivalOffer,
} from '@/lib/festival';

const AD_TYPES = new Set(['HERO_BANNER', 'PROMO_STRIP', 'GOLD_RATE', 'FESTIVAL_OFFER']);

const FESTIVAL_LIMIT_ERROR = `You can run at most ${MAX_ACTIVE_FESTIVAL_OFFERS} festival offers at a time. Deactivate or delete one first.`;

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
    const body: unknown = await req.json().catch(() => null);
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
    if (imageUrl && (await findUnconfirmedMedia(shopId, [imageUrl])).length > 0) {
      return NextResponse.json({ error: 'Image was not uploaded correctly. Please upload it again.' }, { status: 400 });
    }

    let validUntil: Date | undefined;
    let startsAt: Date | undefined;
    let festival: string | undefined;
    if (type === 'FESTIVAL_OFFER') {
      // Date/times without an offset are IST wall-clock; ISO strings with Z/offset are absolute.
      const hasEnd = typeof body.validUntil === 'string' && body.validUntil.trim() !== '';
      const hasStart = typeof body.startsAt === 'string' && body.startsAt.trim() !== '';
      const endMs = parseDateInput(body.validUntil);
      const startMs = parseDateInput(body.startsAt);
      if (hasEnd && endMs === null) {
        return NextResponse.json({ error: 'End date and time is invalid' }, { status: 400 });
      }
      if (hasStart && startMs === null) {
        return NextResponse.json({ error: 'Start date and time is invalid' }, { status: 400 });
      }
      const festivalError = validateFestivalOffer({ title, message, startsAt: startMs, endsAt: endMs });
      if (festivalError) {
        return NextResponse.json({ error: festivalError }, { status: 400 });
      }
      validUntil = new Date(endMs as number);
      if (startMs !== null) startsAt = new Date(startMs);
      festival = sanitizeFestivalLabel(body.festival) || undefined;
    } else if (typeof body.validUntil === 'string' && body.validUntil.trim()) {
      validUntil = new Date(body.validUntil);
      if (!isFutureDate(validUntil)) {
        return NextResponse.json({ error: 'Valid-until date must be in the future' }, { status: 400 });
      }
    }

    await connectToDatabase();

    const activeFestivalFilter = () => ({
      shopId: new Types.ObjectId(shopId),
      type: 'FESTIVAL_OFFER',
      isActive: true,
      validUntil: { $gt: new Date() },
    });
    if (type === 'FESTIVAL_OFFER' && body.isActive !== false) {
      const activeCount = await Advertisement.countDocuments(activeFestivalFilter());
      if (activeCount >= MAX_ACTIVE_FESTIVAL_OFFERS) {
        return NextResponse.json({ error: FESTIVAL_LIMIT_ERROR }, { status: 409 });
      }
    }

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
      ...(type === 'FESTIVAL_OFFER' ? { festival, startsAt } : {}),
    });

    await newAd.save();

    if (type === 'FESTIVAL_OFFER' && newAd.isActive) {
      // Race guard: concurrent creates can both pass the count check above. Keep the oldest N.
      const keep = await Advertisement.find(activeFestivalFilter())
        .sort({ createdAt: 1, _id: 1 })
        .limit(MAX_ACTIVE_FESTIVAL_OFFERS)
        .select('_id')
        .lean();
      if (!keep.some((row) => row._id.toString() === newAd._id.toString())) {
        await Advertisement.deleteOne({ _id: newAd._id });
        return NextResponse.json({ error: FESTIVAL_LIMIT_ERROR }, { status: 409 });
      }
    }
    publishShopContentChange({ shopId, slug: shop.slug }, newAd._id.toString());

    return NextResponse.json({ message: 'Advertisement created successfully', ad: newAd }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create advertisement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
