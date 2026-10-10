import test from "node:test";
import assert from "node:assert/strict";

const { normalizeBrandColor, readableTextOn, darken } = await import("../src/lib/brand-color.ts");

test("accepts 6-digit hex with or without #, in any case", () => {
  assert.equal(normalizeBrandColor("#7B1E2B"), "#7b1e2b");
  assert.equal(normalizeBrandColor("7b1e2b"), "#7b1e2b");
  assert.equal(normalizeBrandColor("  #ABCDEF "), "#abcdef");
});

test("rejects anything that is not a plain 6-digit hex color", () => {
  for (const bad of ["", "#fff", "red", "#12345", "#1234567", "#gggggg", "javascript:alert(1)", "#fff;background:url(x)", null, undefined, 12, {}]) {
    assert.equal(normalizeBrandColor(bad), undefined, String(bad));
  }
});

test("picks readable text color", () => {
  assert.equal(readableTextOn("#ffffff"), "#1c1917");
  assert.equal(readableTextOn("#f5d76e"), "#1c1917");
  assert.equal(readableTextOn("#000000"), "#ffffff");
  assert.equal(readableTextOn("#7b1e2b"), "#ffffff");
});

test("darken mixes toward black and clamps", () => {
  assert.equal(darken("#ffffff", 0), "#ffffff");
  assert.equal(darken("#ffffff", 1), "#000000");
  assert.equal(darken("#c8641e", 0.5), "#64320f");
  assert.equal(darken("#c8641e", 5), "#000000");
});

test("text color always has the better contrast, including bright mid-tones", () => {
  // Bright colors that used to get white text at 2-3:1 contrast now get dark text.
  for (const bright of ["#f59e0b", "#22c55e", "#06b6d4", "#f97316", "#ec4899"]) {
    assert.equal(readableTextOn(bright), "#1c1917", bright);
  }
  for (const dark of ["#7b1e2b", "#0f5132", "#1e3a8a", "#6b21a8", "#111827"]) {
    assert.equal(readableTextOn(dark), "#ffffff", dark);
  }
});
