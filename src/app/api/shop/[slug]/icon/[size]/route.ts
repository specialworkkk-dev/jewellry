import React from "react";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { darken, normalizeBrandColor, readableTextOn } from "@/lib/brand-color";

const ALLOWED_SIZES = new Set([180, 192, 512]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; size: string }> },
) {
  const { slug, size: rawSize } = await context.params;
  const size = Number(rawSize);

  if (!ALLOWED_SIZES.has(size)) {
    return NextResponse.json({ error: "Unsupported icon size" }, { status: 400 });
  }

  await connectToDatabase();
  const shop = await Shop.findOne({ slug, isApproved: true, isActive: true })
    .select("name brandColor")
    .lean();

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const initials = shop.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("") || "L";

  const brandColor = normalizeBrandColor(shop.brandColor);
  // Brand-colored icon: a dark-to-brand gradient, with the ring/initials in whichever of white/dark reads best.
  const background = brandColor
    ? `linear-gradient(145deg, ${brandColor} 0%, ${darken(brandColor, 0.45)} 100%)`
    : "linear-gradient(145deg, #111827 0%, #030712 100%)";
  const accent = brandColor ? readableTextOn(brandColor) : "#fbbf24";
  const inner = brandColor ? darken(brandColor, 0.3) : "#111827";
  const innerText = brandColor ? readableTextOn(inner) : "#fbbf24";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background,
          color: accent,
          borderRadius: "22%",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: "72%",
            height: "72%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${Math.max(4, Math.round(size * 0.025))}px solid ${accent}`,
            borderRadius: "50%",
            backgroundColor: inner,
            color: innerText,
            fontSize: Math.round(size * 0.31),
            fontWeight: 700,
            letterSpacing: "-0.04em",
          },
        },
        initials,
      ),
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
