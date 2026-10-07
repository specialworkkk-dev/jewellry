// Pure helpers (no imports): magic-byte sniffing and presigned-reservation logic.

export type SniffedMedia = { mime: string; kind: "image" | "video" };

/** Bytes needed from the start of a file for sniffing. */
export const SNIFF_BYTES = 512;

function ascii(bytes: Uint8Array, start: number, end: number) {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Detects the real media type from magic bytes. Returns null when unknown. */
export function sniffMedia(bytes: Uint8Array): SniffedMedia | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", kind: "image" };
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return { mime: "image/png", kind: "image" };
  const head6 = ascii(bytes, 0, 6);
  if (head6 === "GIF87a" || head6 === "GIF89a") return { mime: "image/gif", kind: "image" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { mime: "image/webp", kind: "image" };
  if (ascii(bytes, 4, 8) === "ftyp") {
    const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    const end = Math.min(bytes.length, boxSize >= 16 ? boxSize : 32);
    const major = ascii(bytes, 8, 12);
    const brands = [major];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(bytes, i, i + 4));
    if (brands.some((brand) => brand === "avif" || brand === "avis")) return { mime: "image/avif", kind: "image" };
    if (major === "heic" || major === "heix" || major === "mif1" || major === "msf1") return null; // HEIC etc. not supported
    if (major === "qt  ") return { mime: "video/quicktime", kind: "video" };
    return { mime: "video/mp4", kind: "video" };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    // EBML container: WebM declares doctype "webm" (Matroska "matroska" is rejected).
    return ascii(bytes, 0, Math.min(bytes.length, 64)).includes("webm") ? { mime: "video/webm", kind: "video" } : null;
  }
  return null;
}

const MP4_FAMILY = new Set(["video/mp4", "video/quicktime"]);

/** Declared Content-Type must agree with the sniffed type (mp4/mov are interchangeable containers). */
export function declaredMatchesSniffed(declared: string, sniffed: SniffedMedia | null) {
  if (!sniffed) return false;
  const d = declared.toLowerCase();
  return d === sniffed.mime || (MP4_FAMILY.has(d) && MP4_FAMILY.has(sniffed.mime));
}
/** Presigned URL lives 5 minutes; give the client slack to confirm. */
export const RESERVATION_TTL_MS = 15 * 60 * 1000;
/** Reservation records are kept long enough for products to cite confirmed keys. */
export const RESERVATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type ReservationState = "pending" | "confirmed" | "rejected" | "expired";

export function reservationExpiresAt(now: number = Date.now()) {
  return new Date(now + RESERVATION_TTL_MS);
}

export function isReservationExpired(expiresAt: Date | number, now: number = Date.now()) {
  const time = expiresAt instanceof Date ? expiresAt.getTime() : expiresAt;
  return !Number.isFinite(time) || time <= now;
}

/** Only reservations that never reached "confirmed" give their quota unit back. */
export function stateRefundsQuota(state: ReservationState) {
  return state === "rejected" || state === "expired";
}

export type ObjectCheck = { ok: true } | { ok: false; reason: string };

/** Validates an uploaded object against what was declared when the URL was issued. */
export function verifyUploadedObject(input: {
  declaredType: string;
  declaredLength: number;
  actualLength: number | undefined;
  head: Uint8Array;
}): ObjectCheck {
  const { declaredType, declaredLength, actualLength, head } = input;
  if (actualLength === undefined || actualLength !== declaredLength) {
    return { ok: false, reason: "Uploaded file size does not match" };
  }
  const max = declaredType.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (actualLength <= 0 || actualLength > max) return { ok: false, reason: "Uploaded file is too large" };
  const sniffed = sniffMedia(head);
  if (!declaredMatchesSniffed(declaredType, sniffed)) {
    return { ok: false, reason: "File content does not match its declared type" };
  }
  return { ok: true };
}

/** Keys from `candidates` that are not in `referenced`. */
export function subtractKeys(candidates: string[], referenced: Iterable<string>) {
  const used = new Set(referenced);
  return candidates.filter((key) => !used.has(key));
}
