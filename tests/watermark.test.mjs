import test from "node:test";
import assert from "node:assert/strict";

const { isLatinText, asciiSlug, truncateLabel, watermarkLabel, photoFilename, watermarkMetrics } =
  await import("../src/lib/watermark-text.ts");

test("latin check accepts English names and rejects Indic scripts", () => {
  assert.equal(isLatinText("Shree Jewellers & Sons"), true);
  assert.equal(isLatinText("Café Ratna ₹"), true);
  assert.equal(isLatinText("श्री ज्वेलर्स"), false);
  assert.equal(isLatinText("શ્રી જ્વેલર્સ"), false);
  assert.equal(isLatinText("Shree श्री"), false);
  assert.equal(isLatinText("Gold 💍"), false);
  assert.equal(isLatinText(""), false);
});

test("label falls back to the upper-case slug for non-Latin or empty names", () => {
  assert.equal(watermarkLabel("  Shree   Jewellers ", "shree"), "Shree Jewellers");
  assert.equal(watermarkLabel("श्री ज्वेलर्स", "shree-jewellers"), "SHREE-JEWELLERS");
  assert.equal(watermarkLabel(undefined, "abc"), "ABC");
  assert.equal(watermarkLabel(null, null), "JEWELLERY");
});

test("truncateLabel adds an ellipsis only when needed", () => {
  assert.equal(truncateLabel("Short", 10), "Short");
  assert.equal(truncateLabel("Exactly10!", 10), "Exactly10!");
  assert.equal(truncateLabel("Very long shop name", 8), "Very lo…");
  assert.equal(truncateLabel("abc def", 4), "abc…");
  assert.equal(truncateLabel("abcdef", 1), "…");
  assert.equal(truncateLabel("abcdef", 0), "…");
  assert.equal(truncateLabel("abcdef", Number.NaN), "…");
});

test("asciiSlug strips accents, symbols and non-latin text", () => {
  assert.equal(asciiSlug("Gold Ring (22K) – Special!"), "gold-ring-22k-special");
  assert.equal(asciiSlug("Café"), "cafe");
  assert.equal(asciiSlug("सोने की अंगूठी"), "");
  assert.equal(asciiSlug("a".repeat(100), 10), "aaaaaaaaaa");
  assert.equal(asciiSlug("ab-cd", 3), "ab");
  assert.equal(asciiSlug(42), "");
});

test("filename is always safe ASCII", () => {
  assert.equal(photoFilename("shree-jewellers", "Gold Ring", 2), "shree-jewellers-gold-ring-2.jpg");
  assert.equal(photoFilename("shree", "सोना", 1), "shree-photo-1.jpg");
  const nasty = photoFilename('x"\r\nSet-Cookie: a=b', '../../etc/passwd";\n', 3);
  assert.match(nasty, /^[a-z0-9-]+\.jpg$/);
  assert.equal(photoFilename("", "", 0), "shop-photo-1.jpg");
  assert.equal(photoFilename("s", "p", 1.5), "s-p-1.jpg");
});

test("metrics scale with the image width and stay within bounds", () => {
  const small = watermarkMetrics(320, true);
  const large = watermarkMetrics(1600, true);
  assert.ok(large.badgeHeight > small.badgeHeight);
  assert.ok(large.fontSize > small.fontSize);
  assert.ok(small.badgeHeight >= 26 && large.badgeHeight <= 96);
  assert.ok(large.margin <= 48 && small.margin >= 8);
  assert.ok(small.maxBadgeWidth <= 320 - small.margin * 2);
  assert.ok(large.maxNameChars > small.maxNameChars);
  assert.equal(small.showBadge, true);
});

test("logo reduces the room for the name and tiny images are handled", () => {
  assert.ok(watermarkMetrics(800, true).maxNameChars < watermarkMetrics(800, false).maxNameChars);
  const tiny = watermarkMetrics(40, false);
  assert.equal(tiny.showBadge, false);
  assert.ok(tiny.maxBadgeWidth >= 0);
  const weird = watermarkMetrics(Number.NaN, true);
  assert.ok(Number.isFinite(weird.badgeHeight));
});
