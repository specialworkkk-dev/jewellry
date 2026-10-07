import test from "node:test";
import assert from "node:assert/strict";

const { isPlanExpired, getPlanBlock, istDayKey, istDayStart, isShopMediaUrl, priceTypeAllowsPrice, isFutureDate } =
  await import("../src/lib/plan.ts");

test("free plans without planEndsAt never expire", () => {
  assert.equal(isPlanExpired(undefined), false);
  assert.equal(isPlanExpired(null), false);
  assert.equal(getPlanBlock({ isActive: true }), null);
});

test("past planEndsAt expires, future does not", () => {
  const now = Date.parse("2026-10-07T00:00:00Z");
  assert.equal(isPlanExpired(new Date(now - 1000), now), true);
  assert.equal(isPlanExpired(new Date(now + 1000), now), false);
  assert.match(getPlanBlock({ planEndsAt: new Date(now - 1) }, now).error, /expired/);
  assert.equal(getPlanBlock({ isActive: false }).status, 403);
});

test("IST day rolls over at 18:30 UTC", () => {
  assert.equal(istDayKey(Date.parse("2026-10-07T18:29:59Z")), "2026-10-07");
  assert.equal(istDayKey(Date.parse("2026-10-07T18:30:00Z")), "2026-10-08");
  assert.equal(istDayStart(Date.parse("2026-10-07T10:00:00Z")).toISOString(), "2026-10-06T18:30:00.000Z");
});

test("isShopMediaUrl restricts to the shop prefix", () => {
  const base = "https://cdn.example.com";
  assert.equal(isShopMediaUrl(`${base}/shops/a1/products/x.jpg`, base, "a1", "products"), true);
  assert.equal(isShopMediaUrl(`${base}/shops/a1/posts/x.jpg`, base, "a1", "products"), false);
  assert.equal(isShopMediaUrl(`${base}/shops/a1/posts/x.jpg`, base, "a1"), true);
  assert.equal(isShopMediaUrl(`${base}/shops/a10/products/x.jpg`, base, "a1", "products"), false);
  assert.equal(isShopMediaUrl(`${base}/shops/a1/products/../../b/x.jpg`, base, "a1", "products"), false);
  assert.equal(isShopMediaUrl("https://evil.com/shops/a1/products/x.jpg", base, "a1"), false);
  assert.equal(isShopMediaUrl(`${base}/shops/a1/products/x.jpg`, undefined, "a1"), false);
});

test("price types and future dates", () => {
  assert.equal(priceTypeAllowsPrice("FIXED_PRICE"), true);
  assert.equal(priceTypeAllowsPrice("PRICE_ON_REQUEST"), false);
  assert.equal(priceTypeAllowsPrice("CONTACT_FOR_PRICE"), false);
  assert.equal(isFutureDate(new Date(Date.now() + 5000)), true);
  assert.equal(isFutureDate(new Date(Date.now() - 5000)), false);
  assert.equal(isFutureDate(new Date("x")), false);
});

test("expired shops may upload branding only", async () => {
  const { getUploadPlanBlock } = await import("../src/lib/plan.ts");
  const now = Date.parse("2026-10-07T00:00:00Z");
  const expired = { isActive: true, planEndsAt: new Date(now - 1000) };
  assert.equal(getUploadPlanBlock(expired, "logos", now), null);
  assert.equal(getUploadPlanBlock(expired, "covers", now), null);
  for (const folder of ["products", "posts", "stories"]) {
    assert.equal(getUploadPlanBlock(expired, folder, now).status, 403);
  }
  assert.equal(getUploadPlanBlock({ isActive: false, planEndsAt: null }, "logos", now).status, 403);
  assert.equal(getUploadPlanBlock({ isActive: true }, "products", now), null);
});
