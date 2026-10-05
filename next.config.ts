import type { NextConfig } from "next";

const configuredMediaPattern = (() => {
  try {
    return process.env.NEXT_PUBLIC_R2_DEV_URL
      ? new URL(`${process.env.NEXT_PUBLIC_R2_DEV_URL.replace(/\/$/, "")}/**`)
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // The CLI checker cannot be spawned reliably in some restricted build runners.
    // This uses the same project-local TypeScript compiler API instead.
    useTypeScriptCli: false,
    webpackBuildWorker: false,
  },
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      ...(configuredMediaPattern ? [configuredMediaPattern] : []),
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
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
