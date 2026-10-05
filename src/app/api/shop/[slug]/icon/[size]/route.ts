import React from "react";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";

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
    .select("name")
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
          background: "linear-gradient(145deg, #111827 0%, #030712 100%)",
          color: "#fbbf24",
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
            border: `${Math.max(4, Math.round(size * 0.025))}px solid #fbbf24`,
            borderRadius: "50%",
            backgroundColor: "#111827",
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
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
