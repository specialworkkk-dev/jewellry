import test from "node:test";
import assert from "node:assert/strict";

const {
  decidePriceDrop, isPriceLowerThanSaved, priceToRememberAtSave, formatInr, truncateProductName,
  buildAlertValues, selectAudienceSubscriptionIds, isBackInStock, priceDropWindowOpen,
  PRICE_DROP_ALERT_WINDOW_MS,
} = await import("../src/lib/wishlist-alerts.ts");
const {
  customerNotificationTriggers, customerNotificationTemplates, templatesForTrigger, renderNotificationText,
  defaultTemplateForTrigger, targetedNotificationTriggers,
} = await import("../src/lib/notification-templates.ts");

const FIXED = "FIXED_PRICE";

test("price drop needs at least 1% on numeric price types", () => {
  assert.equal(decidePriceDrop({ oldPrice: 10000, newPrice: 9900, oldPriceType: FIXED, newPriceType: FIXED }).drop, true);
  assert.equal(decidePriceDrop({ oldPrice: 10000, newPrice: 9901, oldPriceType: FIXED, newPriceType: FIXED }).drop, false);
  assert.equal(decidePriceDrop({ oldPrice: 50000, newPrice: 40000, oldPriceType: "STARTING_FROM", newPriceType: "STARTING_FROM" }).percent, 20);
  assert.equal(decidePriceDrop({ oldPrice: 50000, newPrice: 40000, oldPriceType: FIXED, newPriceType: "STARTING_FROM" }).drop, true);
});

test("price drop ignores increases, equal prices and bad values", () => {
  const t = { oldPriceType: FIXED, newPriceType: FIXED };
  assert.equal(decidePriceDrop({ ...t, oldPrice: 100, newPrice: 200 }).drop, false);
  assert.equal(decidePriceDrop({ ...t, oldPrice: 100, newPrice: 100 }).drop, false);
  for (const bad of [undefined, null, 0, -5, NaN, Infinity, "100", {}]) {
    assert.equal(decidePriceDrop({ ...t, oldPrice: bad, newPrice: 50 }).drop, false);
    assert.equal(decidePriceDrop({ ...t, oldPrice: 100, newPrice: bad }).drop, false);
  }
  assert.equal(decidePriceDrop({}).drop, false);
});

test("price drop never fires for on-request types", () => {
  assert.equal(decidePriceDrop({ oldPrice: 100, newPrice: 50, oldPriceType: "PRICE_ON_REQUEST", newPriceType: FIXED }).drop, false);
  assert.equal(decidePriceDrop({ oldPrice: 100, newPrice: 50, oldPriceType: FIXED, newPriceType: "CONTACT_FOR_PRICE" }).drop, false);
  assert.equal(decidePriceDrop({ oldPrice: 100, newPrice: 50, oldPriceType: undefined, newPriceType: FIXED }).drop, false);
});

test("saved-price comparison for the Price dropped badge", () => {
  assert.equal(isPriceLowerThanSaved({ price: 900, priceType: FIXED }, 1000), true);
  assert.equal(isPriceLowerThanSaved({ price: 1000, priceType: FIXED }, 1000), false);
  assert.equal(isPriceLowerThanSaved({ price: 900, priceType: FIXED }, undefined), false);
  assert.equal(isPriceLowerThanSaved({ price: 900, priceType: "PRICE_ON_REQUEST" }, 1000), false);
  assert.equal(isPriceLowerThanSaved({ price: null, priceType: FIXED }, 1000), false);
  assert.equal(priceToRememberAtSave({ price: 1200, priceType: "STARTING_FROM" }), 1200);
  assert.equal(priceToRememberAtSave({ price: 1200, priceType: "CONTACT_FOR_PRICE" }), undefined);
  assert.equal(priceToRememberAtSave({ price: 0, priceType: FIXED }), undefined);
});

test("INR formatting uses Indian digit grouping", () => {
  assert.equal(formatInr(0), "₹0");
  assert.equal(formatInr(999), "₹999");
  assert.equal(formatInr(1000), "₹1,000");
  assert.equal(formatInr(45000), "₹45,000");
  assert.equal(formatInr(123456), "₹1,23,456");
  assert.equal(formatInr(1234567), "₹12,34,567");
  assert.equal(formatInr(123456789), "₹12,34,56,789");
  assert.equal(formatInr(1999.5), "₹1,999.50");
  assert.equal(formatInr(NaN), "");
  assert.equal(formatInr(-1), "");
  assert.equal(formatInr("5"), "");
});

test("product names are truncated safely", () => {
  assert.equal(truncateProductName("  Gold   Ring "), "Gold Ring");
  const long = "A".repeat(80);
  const cut = truncateProductName(long);
  assert.equal(Array.from(cut).length, 50);
  assert.ok(cut.endsWith("…"));
  const emoji = truncateProductName("💍".repeat(60), 10);
  assert.equal(Array.from(emoji).length, 10);
  assert.equal(truncateProductName(undefined), "");
  assert.equal(truncateProductName(42), "");
});

test("alert values and rendering insert text literally", () => {
  const values = buildAlertValues({ shopName: "Shree", productName: "Ring $& $1 {price}", price: 123456 });
  assert.equal(values.price, "₹1,23,456");
  const out = renderNotificationText("{productName} is now {price} at {shopName}", { ...values, shopName: "Shree" });
  assert.match(out, /Ring \$& \$1/);
  assert.match(out, /₹1,23,456 at Shree/);
  assert.equal(buildAlertValues({ shopName: "S", price: NaN }).price, undefined);
  assert.equal(renderNotificationText("{productName} {price}", { shopName: "S" }), "our newest design a lower price");
});

test("audience contains only subscriptions of visitors who saved the product", () => {
  const subs = [
    { id: "s1", actorId: "a1" },
    { id: "s2", actorId: "a2" },
    { id: "s3", actorId: null },
    { id: "s4" },
    { id: "s5", actorId: "a1" },
    { id: "s1", actorId: "a1" },
  ];
  assert.deepEqual(selectAudienceSubscriptionIds(subs, ["a1"]).sort(), ["s1", "s5"]);
  assert.deepEqual(selectAudienceSubscriptionIds(subs, new Set(["a2", "zz"])), ["s2"]);
  assert.deepEqual(selectAudienceSubscriptionIds(subs, []), []);
  assert.deepEqual(selectAudienceSubscriptionIds([], ["a1"]), []);
  assert.deepEqual(selectAudienceSubscriptionIds(subs, ["", undefined]), []);
});

test("back in stock only on OUT_OF_STOCK to IN_STOCK", () => {
  assert.equal(isBackInStock("OUT_OF_STOCK", "IN_STOCK"), true);
  assert.equal(isBackInStock("IN_STOCK", "IN_STOCK"), false);
  assert.equal(isBackInStock("IN_STOCK", "OUT_OF_STOCK"), false);
  assert.equal(isBackInStock(undefined, "IN_STOCK"), false);
});

test("price drop window", () => {
  const now = Date.now();
  assert.equal(priceDropWindowOpen(undefined, now), true);
  assert.equal(priceDropWindowOpen(null, now), true);
  assert.equal(priceDropWindowOpen(new Date(now - 60_000), now), false);
  assert.equal(priceDropWindowOpen(new Date(now - PRICE_DROP_ALERT_WINDOW_MS - 1), now), true);
  assert.equal(priceDropWindowOpen("garbage", now), true);
});

test("new triggers have 4-5+ templates and targeted ones are flagged", () => {
  for (const trigger of ["product.price-dropped", "product.back-in-stock"]) {
    assert.ok(customerNotificationTriggers.includes(trigger));
    assert.ok(targetedNotificationTriggers.includes(trigger));
    const templates = templatesForTrigger(trigger);
    assert.ok(templates.length >= 4 && templates.length <= 6);
    assert.equal(defaultTemplateForTrigger(trigger).trigger, trigger);
  }
  assert.ok(templatesForTrigger("product.price-dropped").every((t) => t.body.includes("{price}")));
  assert.equal(new Set(customerNotificationTemplates.map((t) => t.id)).size, customerNotificationTemplates.length);
  assert.ok(!targetedNotificationTriggers.includes("product.created"));
});
