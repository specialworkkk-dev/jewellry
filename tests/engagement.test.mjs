import test from "node:test";
import assert from "node:assert/strict";

const { clientIdFromHeaders } = await import("../src/lib/rate-limit.ts");
const { enquiryDedupeKey, viewDedupeKey, isBotUserAgent, isNonHumanRequest, coarseUserAgent, EVENT_DEDUPE_WINDOWS_MS } = await import("../src/lib/engagement-dedupe.ts");

const h = (o) => ({ get: (k) => o[k] ?? null });

test("forwarding headers ignored without trust", () => {
  assert.equal(clientIdFromHeaders(h({ "x-forwarded-for": "1.2.3.4" }), {}), "unknown");
});
test("TRUST_PROXY_HEADERS enables forwarded headers", () => {
  const env = { TRUST_PROXY_HEADERS: "1" };
  assert.equal(clientIdFromHeaders(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }), env), "1.2.3.4");
  assert.equal(clientIdFromHeaders(h({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }), env), "9.9.9.9");
});
test("Vercel header trusted on Vercel only", () => {
  assert.equal(clientIdFromHeaders(h({ "x-vercel-forwarded-for": "8.8.8.8" }), { VERCEL: "1" }), "8.8.8.8");
  assert.equal(clientIdFromHeaders(h({ "x-vercel-forwarded-for": "8.8.8.8" }), {}), "unknown");
});
test("enquiry dedupe key is stable across formatting, differs across windows", () => {
  const a = enquiryDedupeKey("s1", "+91 98765-43210", "Hello  There", 1000);
  assert.equal(a, enquiryDedupeKey("s1", "+919876543210", " hello there ", 2000));
  assert.notEqual(a, enquiryDedupeKey("s1", "+919876543210", "hello there", 1000 + 10 * 60_000));
  assert.notEqual(a, enquiryDedupeKey("s2", "+919876543210", "hello there", 1000));
});
test("view dedupe key varies by actor and target", () => {
  const k = (c, t) => viewDedupeKey("PRODUCT_VIEW", "s", t, c, "ua", 5);
  assert.equal(k("1.1.1.1", "p"), k("1.1.1.1", "p"));
  assert.notEqual(k("1.1.1.1", "p"), k("2.2.2.2", "p"));
  assert.notEqual(k("1.1.1.1", "p"), k("1.1.1.1", "q"));
});

test("bot and link-preview user agents are detected", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "WhatsApp/2.23.20.0 A",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Twitterbot/1.0",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Mozilla/5.0 (compatible; bingbot/2.0)",
    "curl/8.4.0",
    "",
  ]) assert.equal(isBotUserAgent(ua), true, ua);
  for (const ua of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; CUBOT_X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ]) assert.equal(isBotUserAgent(ua), false, ua);
});
test("HEAD and prefetch requests are non-human", () => {
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  assert.equal(isNonHumanRequest(h({ "user-agent": ua })), false);
  assert.equal(isNonHumanRequest(h({ "user-agent": ua }), "HEAD"), true);
  assert.equal(isNonHumanRequest(h({ "user-agent": ua, purpose: "prefetch" })), true);
  assert.equal(isNonHumanRequest(h({ "user-agent": ua, "sec-purpose": "prefetch;prerender" })), true);
  assert.equal(isNonHumanRequest(h({ "user-agent": ua, "x-moz": "prefetch" })), true);
});
test("coarse UA ignores versions but separates devices", () => {
  const c119 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36";
  const c120 = c119.replace("119", "120");
  assert.equal(coarseUserAgent(c119), coarseUserAgent(c120));
  assert.equal(coarseUserAgent(c119), "chrome/windows");
  assert.notEqual(coarseUserAgent(c119), coarseUserAgent("Mozilla/5.0 (Linux; Android 13) Chrome/120.0 Mobile Safari/537.36"));
});
test("story and whatsapp events dedupe within their own windows", () => {
  const k = (type, now) => viewDedupeKey(type, "s", "t", "1.1.1.1", "ua", now, EVENT_DEDUPE_WINDOWS_MS[type]);
  assert.equal(k("STORY_VIEW", 1000), k("STORY_VIEW", 2000));
  assert.equal(k("WHATSAPP_CLICK", 1000), k("WHATSAPP_CLICK", 2000));
  assert.notEqual(k("WHATSAPP_CLICK", 1000), k("WHATSAPP_CLICK", 1000 + 11 * 60_000));
  assert.notEqual(k("STORY_VIEW", 1000), k("WHATSAPP_CLICK", 1000));
});
