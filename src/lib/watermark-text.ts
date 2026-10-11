/**
 * Pure text/size decisions for the photo watermark. No "@/" imports so node tests can load it directly.
 */

/** Image width (px) the saved photo is limited to. */
export const SAVED_PHOTO_MAX_SIDE = 1600;

// Satori's bundled font only covers Latin: Basic Latin, Latin-1, Latin Extended-A/B, common punctuation, the rupee sign and TM.
const LATIN_ONLY = /^[ -~ -ɏ‐-‧₹™]+$/;

export function isLatinText(value: string): boolean {
  return LATIN_ONLY.test(value);
}

function collapse(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Lower-case ASCII slug made of a-z, 0-9 and single hyphens, at most maxLength long (may be empty). */
export function asciiSlug(value: unknown, maxLength = 40): string {
  const slug = collapse(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}

/** Cuts text to maxChars code points, ending with an ellipsis when something was removed. */
export function truncateLabel(text: string, maxChars: number): string {
  const chars = [...text];
  const max = Math.max(1, Math.floor(Number.isFinite(maxChars) ? maxChars : 1));
  if (chars.length <= max) return text;
  if (max === 1) return "…";
  return `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/**
 * The text printed on the photo. Satori cannot draw Devanagari/Gujarati/etc., so a shop name outside
 * Latin falls back to the (always ASCII) shop slug in upper case.
 */
export function watermarkLabel(name: unknown, slug: unknown): string {
  const cleaned = collapse(name);
  if (cleaned && isLatinText(cleaned)) return cleaned;
  const fallback = asciiSlug(slug, 60).toUpperCase();
  return fallback || "JEWELLERY";
}

/** Safe ASCII download name: <shop-slug>-<product-slug>-<n>.jpg (no quotes, slashes, CR/LF or non-ASCII). */
export function photoFilename(shopSlug: unknown, productName: unknown, number: number): string {
  const shop = asciiSlug(shopSlug, 40) || "shop";
  const product = asciiSlug(productName, 40) || "photo";
  const n = Number.isInteger(number) && number > 0 && number < 1000 ? number : 1;
  return `${shop}-${product}-${n}.jpg`;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type WatermarkMetrics = {
  badgeHeight: number;
  margin: number;
  fontSize: number;
  logoSize: number;
  padX: number;
  gap: number;
  maxBadgeWidth: number;
  /** Characters of the shop name that fit in the badge. */
  maxNameChars: number;
  showBadge: boolean;
  tileFontSize: number;
  tileMaxChars: number;
};

/** All overlay sizes, scaled from the (already resized) image width. */
export function watermarkMetrics(imageWidth: number, hasLogo: boolean): WatermarkMetrics {
  const width = Math.max(1, Math.floor(Number.isFinite(imageWidth) ? imageWidth : 1));
  const badgeHeight = clamp(Math.round(width * 0.055), 26, 96);
  const margin = clamp(Math.round(width * 0.025), 8, 48);
  const fontSize = Math.max(11, Math.round(badgeHeight * 0.42));
  const logoSize = Math.round(badgeHeight * 0.76);
  const padX = Math.round(badgeHeight * 0.32);
  const gap = Math.round(badgeHeight * 0.22);
  const maxBadgeWidth = Math.max(0, Math.min(Math.round(width * 0.72), width - margin * 2));
  const textRoom = maxBadgeWidth - padX * 2 - (hasLogo ? logoSize + gap : 0);
  const maxNameChars = Math.max(0, Math.floor(textRoom / (fontSize * 0.6)));
  return {
    badgeHeight,
    margin,
    fontSize,
    logoSize,
    padX,
    gap,
    maxBadgeWidth,
    maxNameChars,
    showBadge: maxNameChars >= 4 || (hasLogo && maxBadgeWidth >= logoSize + padX * 2),
    tileFontSize: clamp(Math.round(width * 0.026), 11, 44),
    tileMaxChars: 26,
  };
}
