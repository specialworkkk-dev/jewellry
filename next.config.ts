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

// Report-Only: violations are logged in the browser console but nothing is
// blocked. 'unsafe-inline' is required for Next.js bootstrap scripts and the
// PWA install capture script in the root layout. Tighten with nonces and switch
// to enforcing Content-Security-Policy once the console is clean in production.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  // Ably realtime (https + wss), R2 presigned uploads (https PUT) and push endpoints.
  "connect-src 'self' https: wss://*.ably.io wss://*.ably-realtime.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

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
    // Uploaded media uses immutable object keys, so optimized variants can stay
    // at the edge for a month without serving stale replacements.
    minimumCacheTTL: 2592000,
    remotePatterns: [
      ...(configuredMediaPattern ? [configuredMediaPattern] : []),
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev', // Cloudflare R2 Public URLs
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
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicyReportOnly },
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
