import React from "react";
import sharp, { type OverlayOptions } from "sharp";
import { ImageResponse } from "next/og";
import { SAVED_PHOTO_MAX_SIDE, truncateLabel, watermarkLabel, watermarkMetrics } from "@/lib/watermark-text";

// Text is drawn with next/og (satori), whose bundled font works on Vercel where there are no system fonts
// (librsvg text would render as empty boxes). That font only covers Latin, so watermarkLabel() falls back to the
// upper-case shop slug for names written in Devanagari/Gujarati/etc.

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const DIAGONAL_DEGREES = -28;

async function render(element: React.ReactElement, width: number, height: number): Promise<Buffer> {
  const response = new ImageResponse(element, { width, height });
  return Buffer.from(await response.arrayBuffer());
}

/** Shop logo (usually WebP) as a small PNG, or null when it cannot be decoded. */
export async function prepareLogoPng(bytes: Uint8Array | null | undefined, size: number): Promise<Buffer | null> {
  if (!bytes || bytes.length === 0) return null;
  try {
    const px = Math.max(8, Math.round(size));
    return await sharp(bytes, { failOn: "none", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: px, height: px, fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

/** Translucent dark pill (logo + shop name) on a transparent canvas, pill aligned to the right edge. */
async function renderBadge(label: string, logoPng: Buffer | null, imageWidth: number) {
  const m = watermarkMetrics(imageWidth, Boolean(logoPng));
  if (!m.showBadge) return null;
  const name = m.maxNameChars >= 2 ? truncateLabel(label, m.maxNameChars) : "";
  const children: React.ReactNode[] = [];
  if (logoPng) {
    children.push(React.createElement("img", {
      key: "logo",
      src: `data:image/png;base64,${logoPng.toString("base64")}`,
      width: m.logoSize,
      height: m.logoSize,
      style: { width: m.logoSize, height: m.logoSize, borderRadius: m.logoSize, marginRight: name ? m.gap : 0 },
    }));
  }
  if (name) {
    children.push(React.createElement("div", {
      key: "name",
      style: { display: "flex", color: "#ffffff", fontSize: m.fontSize, fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.01em" },
    }, name));
  }
  const pill = React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      height: m.badgeHeight,
      paddingLeft: logoPng ? Math.round(m.padX * 0.5) : m.padX,
      paddingRight: m.padX,
      borderRadius: m.badgeHeight,
      backgroundColor: "rgba(15,15,15,0.7)",
      border: "1px solid rgba(255,255,255,0.22)",
    },
  }, ...children);
  const root = React.createElement("div", {
    style: { display: "flex", width: "100%", height: "100%", justifyContent: "flex-end", alignItems: "center" },
  }, pill);
  const png = await render(root, m.maxBadgeWidth, m.badgeHeight);
  return { png, width: m.maxBadgeWidth, height: m.badgeHeight, margin: m.margin };
}

/** Very faint staggered text, rotated, covering the whole image (deters cropping out the corner badge). */
async function renderDiagonal(label: string, width: number, height: number): Promise<Buffer> {
  const m = watermarkMetrics(width, false);
  const text = truncateLabel(label, m.tileMaxChars);
  const fs = m.tileFontSize;
  const cellW = Math.ceil(text.length * fs * 0.62 + fs * 3);
  const cellH = Math.ceil(fs * 3.4);
  const cell = (key: string, left: number, top: number) => React.createElement("div", {
    key,
    style: {
      position: "absolute", left, top, width: cellW, height: cellH,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.26)", fontSize: fs, fontWeight: 700, whiteSpace: "nowrap",
      textShadow: "0 1px 2px rgba(0,0,0,0.55)",
    },
  }, text);
  const tileW = cellW * 2;
  const tileH = cellH * 2;
  const tile = await render(
    React.createElement("div", { style: { display: "flex", position: "relative", width: "100%", height: "100%" } },
      cell("a", 0, 0), cell("b", cellW, cellH)),
    tileW, tileH,
  );

  const side = Math.ceil(Math.hypot(width, height)) + 2;
  const flat = await sharp({ create: { width: side, height: side, channels: 4, background: TRANSPARENT } })
    .composite([{ input: tile, tile: true }])
    .png({ compressionLevel: 1 })
    .toBuffer();
  const rotated = await sharp(flat).rotate(DIAGONAL_DEGREES, { background: TRANSPARENT }).png({ compressionLevel: 1 }).toBuffer({ resolveWithObject: true });
  const left = Math.max(0, Math.floor((rotated.info.width - width) / 2));
  const top = Math.max(0, Math.floor((rotated.info.height - height) / 2));
  return sharp(rotated.data)
    .extract({ left, top, width: Math.min(width, rotated.info.width - left), height: Math.min(height, rotated.info.height - top) })
    .png({ compressionLevel: 1 })
    .toBuffer();
}

export type WatermarkInput = {
  image: Uint8Array;
  shopName: string;
  shopSlug: string;
  /** Raw logo file bytes (any format sharp reads), optional. */
  logo?: Uint8Array | null;
  /** Already-decoded logo PNG (e.g. from a cache); takes precedence over `logo`. */
  logoPng?: Buffer | null;
};

/**
 * Resizes (<= 1600px, never enlarged, EXIF-rotated, transparency flattened on white), adds the watermark and
 * returns a progressive JPEG. Throws when the bytes are not a readable image.
 */
export async function createWatermarkedJpeg(input: WatermarkInput): Promise<Buffer> {
  const base = await sharp(input.image, { failOn: "none", limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: SAVED_PHOTO_MAX_SIDE, height: SAVED_PHOTO_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = base.info;

  const label = watermarkLabel(input.shopName, input.shopSlug);
  const metrics = watermarkMetrics(width, true);
  const logoPng = input.logoPng ?? await prepareLogoPng(input.logo, metrics.logoSize * 2);

  const [diagonal, badge] = await Promise.all([
    renderDiagonal(label, width, height),
    renderBadge(label, logoPng, width),
  ]);

  const layers: OverlayOptions[] = [{ input: diagonal, left: 0, top: 0 }];
  if (badge && badge.height + badge.margin <= height) {
    const left = Math.max(0, width - badge.margin - badge.width);
    const top = Math.max(0, height - badge.margin - badge.height);
    layers.push({ input: badge.png, left, top });
  }

  return sharp(base.data, { raw: { width, height, channels } })
    .composite(layers)
    .jpeg({ quality: 86, progressive: true })
    .toBuffer();
}
