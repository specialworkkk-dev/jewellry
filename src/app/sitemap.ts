import { MetadataRoute } from 'next';
import connectToDatabase from '@/lib/mongoose';
import Shop from '@/models/Shop';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
  
  await connectToDatabase();
  
  // Fetch all approved shops
  const shops = await Shop.find({ isApproved: true }, 'slug updatedAt');

  const shopEntries: MetadataRoute.Sitemap = shops.map((shop) => ({
    url: `${baseUrl}/shop/${shop.slug}`,
    lastModified: shop.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    ...shopEntries,
  ];
}
