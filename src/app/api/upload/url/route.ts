import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/lib/r2';
import { authOptions } from '@/lib/authOptions';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'jewellery-saas-media';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SHOP_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType, folder } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    const shopId = (session.user as any).shopId;
    
    // Construct a safe, shop-isolated storage path
    // e.g. shops/64df9a1b2c3d/products/timestamp-filename.jpg
    const key = `shops/${shopId}/${folder || 'misc'}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // URL expires in 5 minutes
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    return NextResponse.json({ 
      signedUrl, 
      key, 
      publicUrl: `${process.env.NEXT_PUBLIC_R2_DEV_URL}/${key}` 
    });

  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
