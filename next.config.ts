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
  // Vercel exposes a unique ID for every release, including a redeploy of the
  // same commit. Next.js uses it to refresh clients running an older build.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID
    || process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.NEXT_DEPLOYMENT_ID,
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
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
