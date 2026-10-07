import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Story from '@/models/Story';
import { Types } from 'mongoose';
import { isRecord, safeExternalUrl } from '@/lib/validation';
import { scheduleShopPushNotification } from '@/lib/push-notifications';
import { publishShopContentChange } from '@/lib/public-store-cache';
import { getVerifiedOwnerTenant } from '@/lib/tenant';
import { getPlanBlock, isShopMediaUrl, shopMediaBaseUrl } from '@/lib/plan';
import { findUnconfirmedMedia } from '@/lib/media-quota';

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

    const mediaUrl = safeExternalUrl(body.mediaUrl);

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
    }

    if (!isShopMediaUrl(mediaUrl, shopMediaBaseUrl(), shopId, 'stories')) {
      return NextResponse.json({ error: 'Invalid story media source' }, { status: 400 });
    }
    if ((await findUnconfirmedMedia(shopId, [mediaUrl])).length > 0) {
      return NextResponse.json({ error: 'Media was not uploaded correctly. Please upload it again.' }, { status: 400 });
    }

    await connectToDatabase();

    const newStory = new Story({
      shopId: new Types.ObjectId(shopId),
      mediaUrl,
      mediaType: body.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      linkUrl: safeExternalUrl(body.linkUrl) || undefined,
    });

    await newStory.save();
    await scheduleShopPushNotification(shopId, 'story.created');
    publishShopContentChange({ shopId, slug: shop.slug }, newStory._id.toString());

    return NextResponse.json({ message: 'Story published successfully', story: newStory }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create story error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
