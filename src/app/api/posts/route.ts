import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Post from '@/models/Post';
import { Types } from 'mongoose';
import Product from '@/models/Product';
import { cleanString, isObjectId, isRecord, safeExternalUrl } from '@/lib/validation';

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

    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.slice(0, 10).map(safeExternalUrl).filter(Boolean)
      : [];

    if (mediaUrls.length === 0) {
      return NextResponse.json({ error: 'At least one media URL is required' }, { status: 400 });
    }

    await connectToDatabase();

    let linkedProductId = null;
    if (isObjectId(body.linkedProductId)) {
      const linkedProduct = await Product.findOne({ _id: body.linkedProductId, shopId }).select('_id');
      linkedProductId = linkedProduct?._id ?? null;
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.slice(0, 20).map((tag) => cleanString(tag, 50)).filter(Boolean)
      : [];

    const newPost = new Post({
      shopId: new Types.ObjectId(shopId),
      caption: cleanString(body.caption, 2200),
      mediaUrls,
      mediaType: mediaUrls.length > 1 ? 'CAROUSEL' : (body.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'),
      linkedProductId,
      tags,
    });

    await newPost.save();

    return NextResponse.json({ message: 'Post created successfully', post: newPost }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
