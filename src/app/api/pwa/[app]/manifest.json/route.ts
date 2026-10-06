import { NextResponse } from "next/server";

const INSTALLABLE_APPS = {
  owner: {
    id: "/dashboard",
    name: "LuxeStore Owner",
    shortName: "Store Owner",
    description: "Manage your jewellery storefront, products and enquiries.",
    startUrl: "/dashboard?source=pwa",
    scope: "/dashboard",
  },
  admin: {
    id: "/admin",
    name: "LuxeStore Admin",
    shortName: "Admin",
    description: "Manage LuxeStore shops, users and platform settings.",
    startUrl: "/admin?source=pwa",
    scope: "/admin",
  },
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ app: string }> },
) {
  const { app } = await context.params;
  const config = INSTALLABLE_APPS[app as keyof typeof INSTALLABLE_APPS];

  if (!config) {
    return NextResponse.json({ error: "App manifest not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: config.id,
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    start_url: config.startUrl,
    scope: config.scope,
    display: "standalone",
    display_override: ["standalone"],
    launch_handler: { client_mode: "navigate-existing" },
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#111827",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  }, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/manifest+json",
    },
  });
}
