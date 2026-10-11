/**
 * Pure helpers for festival offers (no app imports, so node tests can load this file).
 * All owner-entered date/times are interpreted as Asia/Kolkata (IST, UTC+05:30, no DST),
 * never in the server's or the browser's own time zone. Festival dates are NEVER hardcoded:
 * they change every year, so presets only suggest a label.
 */

export const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const MAX_FESTIVAL_DURATION_MS = 60 * DAY;
export const MAX_ACTIVE_FESTIVAL_OFFERS = 2;
export const FESTIVAL_LABEL_MAX = 80;
export const FESTIVAL_TITLE_MAX = 160;
export const FESTIVAL_MESSAGE_MAX = 1000;

export const FESTIVAL_PRESETS = [
  "Dhanteras",
  "Diwali",
  "Akshaya Tritiya",
  "Navratri / Dussehra",
  "Eid",
  "Christmas",
  "Wedding Season",
] as const;

/** Suggested offer title for a preset label (empty for custom / blank). */
export function suggestFestivalTitle(label: string): string {
  const clean = label.trim();
  return clean ? `${clean} Special Offer`.slice(0, FESTIVAL_TITLE_MAX) : "";
}

/** Trims, strips control characters and angle brackets, collapses whitespace, caps length. */
export function sanitizeFestivalLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FESTIVAL_LABEL_MAX)
    .trim();
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parses a datetime-local style string ("2026-11-12T18:30") as IST wall-clock time.
 * Returns epoch ms, or null if malformed or not a real calendar date/time.
 */
export function parseIstLocal(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = LOCAL_RE.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59 || y < 2000 || y > 2100) return null;
  const utc = Date.UTC(y, mo - 1, d, h, mi, s);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return utc - IST_OFFSET_MS;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Epoch ms -> "YYYY-MM-DDTHH:mm" in IST (the value format of <input type="datetime-local">). */
export function formatIstLocal(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms + IST_OFFSET_MS);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Epoch ms -> "12 Nov 2026, 6:30 pm IST". */
export function formatIstDisplay(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms + IST_OFFSET_MS);
  const h24 = d.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h12}:${pad(d.getUTCMinutes())} ${h24 < 12 ? "am" : "pm"} IST`;
}

/**
 * Parses either a bare datetime-local value (taken as IST) or an absolute ISO string
 * with Z / explicit offset. Returns epoch ms or null. Empty/undefined -> null.
 */
export function parseDateInput(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (LOCAL_RE.test(raw)) return parseIstLocal(raw);
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Remaining whole seconds' worth of ms, never negative. */
  totalMs: number;
  done: boolean;
  /** Seconds are shown only in the last hour. */
  showSeconds: boolean;
}

/** Breaks remaining ms into d/h/m/s. Never negative; NaN/invalid counts as finished. */
export function countdownBreakdown(remainingMs: number): CountdownParts {
  const safe = Number.isFinite(remainingMs) ? Math.max(0, Math.floor(remainingMs / 1000) * 1000) : 0;
  const days = Math.floor(safe / DAY);
  const hours = Math.floor((safe % DAY) / HOUR);
  const minutes = Math.floor((safe % HOUR) / MINUTE);
  const seconds = Math.floor((safe % MINUTE) / 1000);
  return { days, hours, minutes, seconds, totalMs: safe, done: safe <= 0, showSeconds: safe > 0 && safe < HOUR };
}

/** "2d 04h 12m", "4h 12m", "12m 05s" (seconds only in the last hour), "0s" when done. */
export function formatCountdown(remainingMs: number): string {
  const c = countdownBreakdown(remainingMs);
  if (c.done) return "0s";
  if (c.showSeconds) return `${c.minutes}m ${pad(c.seconds)}s`;
  if (c.days > 0) return `${c.days}d ${pad(c.hours)}h ${pad(c.minutes)}m`;
  return `${c.hours}h ${pad(c.minutes)}m`;
}

/** Screen-reader wording without seconds, e.g. "2 days 4 hours 12 minutes". */
export function spokenCountdown(remainingMs: number): string {
  const c = countdownBreakdown(remainingMs);
  if (c.done) return "ended";
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (c.days > 0) parts.push(unit(c.days, "day"));
  if (c.days > 0 || c.hours > 0) parts.push(unit(c.hours, "hour"));
  parts.push(unit(c.minutes, "minute"));
  return parts.join(" ");
}

/** How long to wait before the next tick: every 1s in the last hour, else every 30s. */
export function nextTickDelay(remainingMs: number): number {
  return remainingMs <= HOUR ? 1000 : 30_000;
}

export type FestivalStatus = "SCHEDULED" | "LIVE" | "EXPIRED" | "INACTIVE";

/** Status from the stored fields. Expired wins; then inactive; then scheduled vs live. */
export function festivalStatus(
  ad: { isActive?: boolean; startsAt?: Date | string | number | null; validUntil?: Date | string | number | null },
  now: number = Date.now(),
): FestivalStatus {
  const end = ad.validUntil != null ? new Date(ad.validUntil).getTime() : NaN;
  const start = ad.startsAt != null ? new Date(ad.startsAt).getTime() : NaN;
  if (Number.isFinite(end) && end <= now) return "EXPIRED";
  if (ad.isActive === false) return "INACTIVE";
  if (Number.isFinite(start) && start > now) return "SCHEDULED";
  return "LIVE";
}

export interface FestivalInput {
  title: string;
  message: string;
  startsAt: number | null;
  endsAt: number | null;
}

/** Validates a new festival offer. Returns an error message, or null when valid. */
export function validateFestivalOffer(input: FestivalInput, now: number = Date.now()): string | null {
  if (!input.title.trim()) return "Title is required";
  if (!input.message.trim()) return "Offer message is required";
  if (input.endsAt == null || !Number.isFinite(input.endsAt)) return "End date and time is required";
  if (input.endsAt <= now) return "End time must be in the future";
  if (input.startsAt != null) {
    if (!Number.isFinite(input.startsAt)) return "Start date and time is invalid";
    if (input.startsAt >= input.endsAt) return "Start time must be before the end time";
  }
  const from = input.startsAt != null ? input.startsAt : now;
  if (input.endsAt - from > MAX_FESTIVAL_DURATION_MS) return "A festival offer can run for at most 60 days";
  return null;
}
