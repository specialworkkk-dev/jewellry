import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev', // Cloudflare R2 Public URLs
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth Avatars
      }
    ],
  },
  // Ignore specific typescript errors during build if necessary (usually leave false for production)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
