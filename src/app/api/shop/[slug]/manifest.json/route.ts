import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Shop from '@/models/Shop';

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    
    const { slug } = await context.params;
    const shop = await Shop.findOne({ slug, isApproved: true, isActive: true });
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const manifest = {
      name: shop.name,
      short_name: shop.name,
      description: shop.shortDescription || `Welcome to ${shop.name}`,
      start_url: `/shop/${shop.slug}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#111827", // Gray-900 to match the dark hero section
      icons: [
        {
          src: shop.logoUrl || "/icon-192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: shop.logoUrl || "/icon-512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    };

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Manifest generation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
