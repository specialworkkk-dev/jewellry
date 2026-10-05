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
      id: `/shop/${shop.slug}`,
      name: shop.name,
      short_name: shop.name.slice(0, 24),
      description: shop.shortDescription || `Welcome to ${shop.name}`,
      start_url: `/shop/${shop.slug}?source=pwa`,
      scope: `/shop/${shop.slug}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#111827",
      icons: [
        {
          src: `/api/shop/${shop.slug}/icon/192`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: `/api/shop/${shop.slug}/icon/512`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        }
      ]
    };

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Content-Type": "application/manifest+json",
      },
    });
  } catch (error) {
    console.error("Manifest generation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
