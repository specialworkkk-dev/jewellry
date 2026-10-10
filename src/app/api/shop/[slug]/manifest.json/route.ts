import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Shop from '@/models/Shop';
import { DEFAULT_THEME_COLOR, normalizeBrandColor } from '@/lib/brand-color';

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

    const brandColor = normalizeBrandColor(shop.brandColor);

    // Changing the color changes the icon URL, so browsers and CDNs fetch the new artwork.
    const iconVersion = brandColor ? `?c=${brandColor.slice(1)}` : '';

    const manifest = {
      id: `/shop/${shop.slug}`,
      name: shop.name,
      short_name: shop.name.slice(0, 24),
      description: shop.shortDescription || `Welcome to ${shop.name}`,
      lang: "en-IN",
      start_url: `/shop/${shop.slug}?source=pwa`,
      scope: `/shop/${shop.slug}`,
      display: "standalone",
      display_override: ["standalone"],
      launch_handler: { client_mode: "navigate-existing" },
      orientation: "portrait-primary",
      background_color: brandColor ?? "#ffffff",
      theme_color: brandColor ?? DEFAULT_THEME_COLOR,
      categories: ["shopping", "lifestyle"],
      prefer_related_applications: false,
      icons: [
        {
          src: `/api/shop/${shop.slug}/icon/192${iconVersion}`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: `/api/shop/${shop.slug}/icon/512${iconVersion}`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        }
      ]
    };

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Type": "application/manifest+json",
      },
    });
  } catch (error) {
    console.error("Manifest generation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
