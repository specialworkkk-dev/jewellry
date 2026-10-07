import test from "node:test";
import assert from "node:assert/strict";

const { pickRandomStorefrontTemplate, resolveStorefrontTemplate, STOREFRONT_TEMPLATE_COUNT } = await import("../src/lib/storefront-template.ts");

test("resolveStorefrontTemplate is stable and in range for legacy shops", () => {
  for (let i = 0; i < 500; i += 1) {
    const slug = `shop-${i}-${crypto.randomUUID()}`;
    const first = resolveStorefrontTemplate({ slug });
    assert.equal(resolveStorefrontTemplate({ slug, storefrontTemplate: null }), first);
    assert.ok(Number.isInteger(first) && first >= 1 && first <= STOREFRONT_TEMPLATE_COUNT);
  }
});

test("resolveStorefrontTemplate honours valid stored values and ignores invalid ones", () => {
  assert.equal(resolveStorefrontTemplate({ slug: "a", storefrontTemplate: 4 }), 4);
  const fallback = resolveStorefrontTemplate({ slug: "a" });
  for (const bad of [0, 6, 2.5, -1, Number.NaN]) {
    assert.equal(resolveStorefrontTemplate({ slug: "a", storefrontTemplate: bad }), fallback);
  }
});

test("pickRandomStorefrontTemplate stays in range and is roughly uniform", () => {
  const draws = 20000;
  const counts = new Map();
  for (let i = 0; i < draws; i += 1) {
    const value = pickRandomStorefrontTemplate();
    assert.ok(Number.isInteger(value) && value >= 1 && value <= STOREFRONT_TEMPLATE_COUNT);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  assert.equal(counts.size, STOREFRONT_TEMPLATE_COUNT);
  const expected = draws / STOREFRONT_TEMPLATE_COUNT;
  for (const count of counts.values()) assert.ok(Math.abs(count - expected) < expected * 0.1, `count ${count}`);
});
