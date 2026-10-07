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

/** Per-event dedupe windows. Stories and WhatsApp taps are deduped like views. */
export const EVENT_DEDUPE_WINDOWS_MS: Record<string, number> = {
  SHOP_VIEW: VIEW_DEDUPE_WINDOW_MS,
  PRODUCT_VIEW: VIEW_DEDUPE_WINDOW_MS,
  STORY_VIEW: VIEW_DEDUPE_WINDOW_MS,
  WHATSAPP_CLICK: 10 * 60 * 1000,
};

const BOT_UA_PATTERN = new RegExp(
  [
    "(?<!cu)bot\\b", "crawl", "spider", "slurp", "facebookexternalhit", "facebot", "whatsapp",
    "telegram", "twitterbot", "slack", "discord", "linkedin", "pinterest", "skype",
    "vkshare", "embedly", "quora link", "outbrain", "redditbot", "applebot",
    "bingpreview", "google-read-aloud", "google-inspectiontool", "googleother",
    "mediapartners", "adsbot", "duckduck", "baiduspider", "yandex", "semrush",
    "ahrefs", "mj12", "dotbot", "petalbot", "bytespider", "headlesschrome",
    "phantomjs", "lighthouse", "pagespeed", "gtmetrix", "uptimerobot", "pingdom",
    "statuscake", "curl/", "wget/", "python-requests", "python-urllib", "go-http-client",
    "okhttp", "java/", "libwww", "axios/", "node-fetch", "undici", "postmanruntime",
    "preview", "monitor", "scanner", "fetcher",
  ].join("|"),
  "i",
);

/** True for crawlers, link-preview fetchers, HTTP libraries and empty user agents. */
export function isBotUserAgent(userAgent: string | null | undefined) {
  const ua = (userAgent ?? "").trim();
  if (ua.length < 8) return true;
  return BOT_UA_PATTERN.test(ua);
}

type HeaderReader = { get(name: string): string | null };

/** True when the request is not a real, human page view (bot, HEAD, prefetch/preview). */
export function isNonHumanRequest(headers: HeaderReader, method?: string) {
  if (method && method.toUpperCase() === "HEAD") return true;
  if (isBotUserAgent(headers.get("user-agent"))) return true;
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""} ${headers.get("x-purpose") ?? ""}`.toLowerCase();
  if (/prefetch|prerender|preview/.test(purpose)) return true;
  const moz = (headers.get("x-moz") ?? "").toLowerCase();
  return moz === "prefetch";
}

/**
 * Coarse browser identity: browser family + OS family only (no versions), so a
 * browser update does not look like a new visitor but two devices behind one
 * NAT/IP usually do.
 */
export function coarseUserAgent(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const os = /android/i.test(ua) ? "android"
    : /iphone|ipad|ipod|ios/i.test(ua) ? "ios"
      : /windows/i.test(ua) ? "windows"
        : /mac os x|macintosh/i.test(ua) ? "mac"
          : /cros/i.test(ua) ? "chromeos"
            : /linux/i.test(ua) ? "linux" : "other";
  const browser = /edg(e|a|ios)?\//i.test(ua) ? "edge"
    : /opr\/|opera/i.test(ua) ? "opera"
      : /samsungbrowser/i.test(ua) ? "samsung"
        : /firefox|fxios/i.test(ua) ? "firefox"
          : /chrome|crios/i.test(ua) ? "chrome"
            : /safari/i.test(ua) ? "safari" : "other";
  return `${browser}/${os}`;
}
