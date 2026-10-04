import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Interaction from '@/models/Interaction';
import Product from '@/models/Product';
import Post from '@/models/Post';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required to interact' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { targetId, targetType, interactionType, shopId } = await req.json();

    if (!targetId || !targetType || !interactionType || !shopId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Check if interaction already exists
    const existingInteraction = await Interaction.findOne({
      userId,
      targetId,
      interactionType
    });

    if (existingInteraction) {
      // Toggle OFF (Unlike / Unfavorite)
      await Interaction.findByIdAndDelete(existingInteraction._id);
      
      // Decrement counters
      if (interactionType === 'LIKE') {
        if (targetType === 'PRODUCT') await Product.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
        if (targetType === 'POST') await Post.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
      }

      return NextResponse.json({ message: 'Interaction removed', state: false });
    } else {
      // Toggle ON (Like / Favorite)
      const newInteraction = new Interaction({
        userId,
        shopId,
        targetId,
        targetType,
        interactionType
      });
      await newInteraction.save();
      
      // Increment counters
      if (interactionType === 'LIKE') {
        if (targetType === 'PRODUCT') await Product.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
        if (targetType === 'POST') await Post.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
      }

      return NextResponse.json({ message: 'Interaction added', state: true });
    }

  } catch (error: any) {
    console.error('Interaction error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
