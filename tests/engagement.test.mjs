import test from "node:test";
import assert from "node:assert/strict";

const { clientIdFromHeaders } = await import("../src/lib/rate-limit.ts");
const { enquiryDedupeKey, viewDedupeKey } = await import("../src/lib/engagement-dedupe.ts");

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
