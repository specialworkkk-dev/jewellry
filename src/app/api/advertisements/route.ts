import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Advertisement from '@/models/Advertisement';
import { Types } from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = (session.user as any).shopId;
    const body = await req.json();

    if (!body.title || !body.message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Special logic: If they are posting a new GOLD_RATE, deactivate older gold rates automatically
    if (body.type === 'GOLD_RATE') {
      await Advertisement.updateMany(
        { shopId: new Types.ObjectId(shopId), type: 'GOLD_RATE', isActive: true },
        { $set: { isActive: false } }
      );
    }

    const newAd = new Advertisement({
      ...body,
      shopId: new Types.ObjectId(shopId),
    });

    await newAd.save();

    return NextResponse.json({ message: 'Advertisement created successfully', ad: newAd }, { status: 201 });
  } catch (error: any) {
    console.error('Create advertisement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
