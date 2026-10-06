import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function canonicalProductionUrl() {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const configuredUrl = explicitBaseUrl
    || (vercelProductionHost ? `https://${vercelProductionHost}` : process.env.NEXTAUTH_URL?.trim());
  if (!configuredUrl || process.env.VERCEL_ENV !== "production") return null;

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const canonical = canonicalProductionUrl();
  if (!canonical || request.nextUrl.hostname === canonical.hostname) {
    return NextResponse.next();
  }

  // Authentication cookies are origin-bound. Force all production deployment
  // aliases onto the one configured origin so an installed owner app and the
  // browser always use the same persistent seven-day session.
  const destination = request.nextUrl.clone();
  destination.protocol = canonical.protocol;
  destination.host = canonical.host;
  return NextResponse.redirect(destination, 307);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
