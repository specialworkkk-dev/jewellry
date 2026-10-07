import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

export async function proxy(request: NextRequest) {
  const canonical = canonicalProductionUrl();
  if (canonical && request.nextUrl.hostname !== canonical.hostname) {
    // Authentication cookies are origin-bound. Force all production deployment
    // aliases onto the one configured origin so an installed owner app and the
    // browser always use the same persistent seven-day session.
    const destination = request.nextUrl.clone();
    destination.protocol = canonical.protocol;
    destination.host = canonical.host;
    return NextResponse.redirect(destination, 307);
  }

  // Installed PWAs can reopen either the platform start URL or their last
  // /login URL. Resolve the signed cookie before rendering so a valid session
  // resumes the correct dashboard without flashing the hero or login page.
  // `?reauth=1` is set by guards whose DB check rejected an otherwise valid
  // cookie (deleted user/shop); redirecting back would loop forever.
  const skipResume = request.nextUrl.searchParams.has("reauth");
  if (!skipResume && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/login")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (token?.role === "SHOP_OWNER") {
      return NextResponse.redirect(new URL("/dashboard", request.url), 307);
    }

    if (token?.role === "SUPER_ADMIN" || token?.role === "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url), 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
