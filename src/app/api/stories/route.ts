import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Story from '@/models/Story';
import { Types } from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = (session.user as any).shopId;
    const body = await req.json();

    if (!body.mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
    }

    await connectToDatabase();

    const newStory = new Story({
      shopId: new Types.ObjectId(shopId),
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType || 'IMAGE',
      linkUrl: body.linkUrl,
    });

    await newStory.save();

    return NextResponse.json({ message: 'Story published successfully', story: newStory }, { status: 201 });
  } catch (error: any) {
    console.error('Create story error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
