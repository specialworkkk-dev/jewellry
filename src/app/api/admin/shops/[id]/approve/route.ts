import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongoose';
import Shop from '@/models/Shop';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    const shop = await Shop.findById(id);
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    shop.isApproved = true;
    await shop.save();

    return NextResponse.json({ message: 'Shop approved successfully' });
  } catch (error) {
    console.error('Approve shop error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
