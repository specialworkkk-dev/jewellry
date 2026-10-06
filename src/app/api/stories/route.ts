import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Story from '@/models/Story';
import { Types } from 'mongoose';
import { isRecord, safeExternalUrl } from '@/lib/validation';
import { scheduleShopPushNotification } from '@/lib/push-notifications';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const body: unknown = await req.json();
    if (!shopId || !isRecord(body)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const mediaUrl = safeExternalUrl(body.mediaUrl);

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
    }

    await connectToDatabase();

    const newStory = new Story({
      shopId: new Types.ObjectId(shopId),
      mediaUrl,
      mediaType: body.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      linkUrl: safeExternalUrl(body.linkUrl) || undefined,
    });

    await newStory.save();
    scheduleShopPushNotification(shopId, 'story.created');

    return NextResponse.json({ message: 'Story published successfully', story: newStory }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create story error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
