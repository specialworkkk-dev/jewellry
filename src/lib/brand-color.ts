/** Owner-chosen brand color helpers. Pure string/number math: safe on the client, the server and in node tests. */

const HEX_COLOR = /^#?([0-9a-f]{6})$/i;

export const DEFAULT_THEME_COLOR = "#111827";

/** "#RRGGBB" (lower-case) for a valid 6-digit hex value, otherwise undefined. */
export function normalizeBrandColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = HEX_COLOR.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : undefined;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((part) => Math.round(Math.min(255, Math.max(0, part))).toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((part) => {
    const c = part / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#1c1917";

/** WCAG contrast ratio between two relative luminances. */
function contrast(a: number, b: number) {
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/** White or near-black, whichever has the higher contrast on `hex` (never below ~4.5:1 for either extreme). */
export function readableTextOn(hex: string) {
  const background = luminance(hex);
  return contrast(background, luminance(LIGHT_TEXT)) >= contrast(background, luminance(DARK_TEXT)) ? LIGHT_TEXT : DARK_TEXT;
}

/** Mixes `hex` toward black; amount 0 keeps it, 1 is black. */
export function darken(hex: string, amount: number) {
  const factor = 1 - Math.min(1, Math.max(0, amount));
  const [r, g, b] = channels(hex);
  return toHex([r * factor, g * factor, b * factor]);
}
