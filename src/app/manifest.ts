import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LuxeStore',
    short_name: 'LuxeStore',
    description: 'Premium jewellery storefront SaaS',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#111827',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
