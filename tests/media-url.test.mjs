import test from "node:test";
import assert from "node:assert/strict";

const { isThumbEligible, fullSizeBaseName, thumbKeyFor, thumbUrlFor } = await import("../src/lib/media-url.ts");
const UUID = "0b9d6a52-7c1e-4f3a-9d2b-5e6f7a8b9c0d";

test("only webp photos in products/posts/stories get thumbnails", () => {
  assert.equal(isThumbEligible("products", "image/webp"), true);
  assert.equal(isThumbEligible("posts", "image/webp"), true);
  assert.equal(isThumbEligible("stories", "image/webp"), true);
  assert.equal(isThumbEligible("covers", "image/webp"), false);
  assert.equal(isThumbEligible("logos", "image/webp"), false);
  assert.equal(isThumbEligible("products", "image/jpeg"), false);
  assert.equal(isThumbEligible("products", "video/mp4"), false);
});

test("thumbnail key mirrors the full-size key for both naming forms", () => {
  const withName = `shops/abc/products/${fullSizeBaseName(UUID)}-ring_photo.webp`;
  assert.equal(thumbKeyFor(withName), `shops/abc/products/${UUID}~s-ring_photo.webp`);
  const bare = `shops/abc/stories/${fullSizeBaseName(UUID)}.webp`;
  assert.equal(thumbKeyFor(bare), `shops/abc/stories/${UUID}~s.webp`);
});

test("old and unrelated keys have no thumbnail", () => {
  assert.equal(thumbKeyFor(`shops/abc/products/${UUID}-ring.webp`), null); // uploaded before thumbnails existed
  assert.equal(thumbKeyFor(`shops/abc/products/${UUID}-ring.jpg`), null);
  assert.equal(thumbKeyFor(`shops/abc/products/${UUID}~t-clip.mp4`), null);
  assert.equal(thumbKeyFor(`shops/abc/products/${UUID}~s-ring.webp`), null); // a thumbnail has no thumbnail
  assert.equal(thumbKeyFor("shops/abc/products/ring.webp"), null);
});

test("thumbnail URL derives from the public URL and keeps the query", () => {
  const base = "https://pub-x.r2.dev/shops/abc/products";
  assert.equal(thumbUrlFor(`${base}/${UUID}~t-a.webp`), `${base}/${UUID}~s-a.webp`);
  assert.equal(thumbUrlFor(`${base}/${UUID}~t-a.webp?v=2`), `${base}/${UUID}~s-a.webp?v=2`);
  assert.equal(thumbUrlFor(`${base}/${UUID}-a.webp`), null);
  assert.equal(thumbUrlFor(""), null);
  assert.equal(thumbUrlFor("https://images.unsplash.com/photo-1?w=800"), null);
});

test("user file names cannot forge the marker (tilde is sanitised before keys are built)", () => {
  const sanitised = "evil~t-x.webp".replace(/[^a-zA-Z0-9.-]/g, "_");
  assert.equal(sanitised, "evil_t-x.webp");
  assert.equal(thumbKeyFor(`shops/abc/products/${UUID}-${sanitised}`), null);
});
