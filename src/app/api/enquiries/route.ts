import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Enquiry from '@/models/Enquiry';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shopId, productId, customerName, customerPhone, message, source } = body;

    if (!shopId || !customerName || !customerPhone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const newEnquiry = new Enquiry({
      shopId,
      productId,
      customerName,
      customerPhone,
      message,
      source: source || 'WEBSITE_FORM'
    });

    await newEnquiry.save();

    return NextResponse.json({ message: 'Enquiry submitted successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Submit enquiry error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
