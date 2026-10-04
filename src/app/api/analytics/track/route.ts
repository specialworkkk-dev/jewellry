import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import AnalyticsEvent from '@/models/AnalyticsEvent';
import { Types } from 'mongoose';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shopId, eventType, targetId } = body;

    if (!shopId || !eventType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await connectToDatabase();

    // Fire and forget event logging (no need to authenticate, as it's public tracking)
    const newEvent = new AnalyticsEvent({
      shopId: new Types.ObjectId(shopId),
      eventType,
      targetId: targetId ? new Types.ObjectId(targetId) : undefined,
      // IP and User-Agent can be collected here optionally
    });

    await newEvent.save();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Don't throw 500s for analytics failures, fail silently
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
