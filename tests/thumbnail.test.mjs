import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { makeThumbnail } = await import("../src/lib/thumbnail.ts");

const photo = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 201, g: 162, b: 75 } } })
  .composite([{ input: Buffer.from(`<svg width="${w}" height="${h}"><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="#222"/></svg>`) }]);

test("large landscape photo becomes a <=640px WebP with the same shape", async () => {
  const input = await photo(3200, 2000).jpeg({ quality: 90 }).toBuffer();
  const out = await makeThumbnail(input);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 640);
  assert.equal(meta.height, 400);
  assert.ok(out.length < input.length / 4);
});

test("portrait photo is limited by height", async () => {
  const out = await makeThumbnail(await photo(1500, 3000).png().toBuffer());
  const meta = await sharp(out).metadata();
  assert.equal(meta.height, 640);
  assert.equal(meta.width, 320);
});

test("small photos are never enlarged", async () => {
  const out = await makeThumbnail(await photo(300, 200).webp().toBuffer());
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 300);
  assert.equal(meta.height, 200);
});

test("corrupt input rejects instead of hanging", async () => {
  await assert.rejects(() => makeThumbnail(Buffer.from("not an image")));
});
