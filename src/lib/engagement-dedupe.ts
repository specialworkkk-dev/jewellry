import { createHash } from "node:crypto";

export const ENQUIRY_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
export const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function dedupeBucket(now: number, windowMs: number) {
  return Math.floor(now / windowMs);
}

export function enquiryDedupeKey(
  shopId: string,
  phone: string,
  message: string,
  now = Date.now(),
  windowMs = ENQUIRY_DEDUPE_WINDOW_MS,
) {
  const normalized = `${phone.replace(/\D/g, "")}|${message.trim().toLowerCase().replace(/\s+/g, " ")}`;
  return `enq:${shopId}:${sha256(normalized)}:${dedupeBucket(now, windowMs)}`;
}

export function viewDedupeKey(
  eventType: string,
  shopId: string,
  targetId: string | undefined,
  clientId: string,
  userAgent: string,
  now = Date.now(),
  windowMs = VIEW_DEDUPE_WINDOW_MS,
) {
  const actor = sha256(`${clientId}|${userAgent}`).slice(0, 32);
  return `${eventType}:${shopId}:${targetId ?? "-"}:${actor}:${dedupeBucket(now, windowMs)}`;
}
