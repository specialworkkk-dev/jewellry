import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Post from '@/models/Post';
import { Types } from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = (session.user as any).shopId;
    const body = await req.json();

    if (!body.mediaUrls || !Array.isArray(body.mediaUrls) || body.mediaUrls.length === 0) {
      return NextResponse.json({ error: 'At least one media URL is required' }, { status: 400 });
    }

    await connectToDatabase();

    const newPost = new Post({
      shopId: new Types.ObjectId(shopId),
      caption: body.caption,
      mediaUrls: body.mediaUrls,
      mediaType: body.mediaUrls.length > 1 ? 'CAROUSEL' : (body.mediaType || 'IMAGE'),
      linkedProductId: body.linkedProductId ? new Types.ObjectId(body.linkedProductId) : null,
      tags: body.tags || [],
    });

    await newPost.save();

    return NextResponse.json({ message: 'Post created successfully', post: newPost }, { status: 201 });
  } catch (error: any) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
