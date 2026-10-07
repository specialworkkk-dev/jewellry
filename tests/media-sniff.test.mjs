import test from "node:test";
import assert from "node:assert/strict";

const {
  sniffMedia, declaredMatchesSniffed, verifyUploadedObject, isReservationExpired,
  reservationExpiresAt, RESERVATION_TTL_MS, stateRefundsQuota, subtractKeys, MAX_IMAGE_BYTES,
} = await import("../src/lib/media-sniff.ts");

const pad = (bytes, n = 64) => Uint8Array.from([...bytes, ...new Array(Math.max(0, n - bytes.length)).fill(0)]);
const text = (s) => [...s].map((c) => c.charCodeAt(0));
const ftyp = (brand, compat = []) => {
  const body = [...text("ftyp"), ...text(brand), 0, 0, 0, 0, ...compat.flatMap(text)];
  const size = body.length + 4;
  return pad([0, 0, 0, size, ...body]);
};

test("sniffs images", () => {
  assert.equal(sniffMedia(pad([0xff, 0xd8, 0xff, 0xe0])).mime, "image/jpeg");
  assert.equal(sniffMedia(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).mime, "image/png");
  assert.equal(sniffMedia(pad(text("GIF89a"))).mime, "image/gif");
  assert.equal(sniffMedia(pad([...text("RIFF"), 1, 2, 3, 4, ...text("WEBP")])).mime, "image/webp");
  assert.equal(sniffMedia(ftyp("avif", ["mif1"])).mime, "image/avif");
  assert.equal(sniffMedia(ftyp("mif1", ["avif"])).mime, "image/avif");
});

test("sniffs video containers", () => {
  assert.equal(sniffMedia(ftyp("isom", ["mp42"])).mime, "video/mp4");
  assert.equal(sniffMedia(ftyp("qt  ")).mime, "video/quicktime");
  assert.equal(sniffMedia(pad([0x1a, 0x45, 0xdf, 0xa3, ...text("webm")])).mime, "video/webm");
  assert.equal(sniffMedia(pad([0x1a, 0x45, 0xdf, 0xa3, ...text("matroska")])), null);
});

test("rejects disguised or unknown content", () => {
  assert.equal(sniffMedia(pad(text("<html><script>alert(1)</script>"))), null);
  assert.equal(sniffMedia(pad(text("MZ\x90\x00"))), null);
  assert.equal(sniffMedia(ftyp("heic")), null);
  assert.equal(sniffMedia(new Uint8Array(4)), null);
});

test("declared type must match sniffed type", () => {
  const jpeg = sniffMedia(pad([0xff, 0xd8, 0xff]));
  assert.equal(declaredMatchesSniffed("image/jpeg", jpeg), true);
  assert.equal(declaredMatchesSniffed("image/png", jpeg), false);
  assert.equal(declaredMatchesSniffed("video/mp4", jpeg), false);
  assert.equal(declaredMatchesSniffed("video/quicktime", sniffMedia(ftyp("isom"))), true);
  assert.equal(declaredMatchesSniffed("image/jpeg", null), false);
});

test("verifyUploadedObject checks size, limit and content", () => {
  const head = pad([0xff, 0xd8, 0xff]);
  const base = { declaredType: "image/jpeg", declaredLength: 1000, actualLength: 1000, head };
  assert.equal(verifyUploadedObject(base).ok, true);
  assert.equal(verifyUploadedObject({ ...base, actualLength: 999 }).ok, false);
  assert.equal(verifyUploadedObject({ ...base, actualLength: undefined }).ok, false);
  assert.equal(verifyUploadedObject({ ...base, declaredLength: MAX_IMAGE_BYTES + 1, actualLength: MAX_IMAGE_BYTES + 1 }).ok, false);
  assert.equal(verifyUploadedObject({ ...base, head: pad(text("not an image at all")) }).ok, false);
});

test("reservation expiry and refund rules", () => {
  const now = 1_000_000;
  assert.equal(reservationExpiresAt(now).getTime(), now + RESERVATION_TTL_MS);
  assert.equal(isReservationExpired(now + 1, now), false);
  assert.equal(isReservationExpired(now, now), true);
  assert.equal(isReservationExpired(new Date("x"), now), true);
  assert.equal(stateRefundsQuota("pending"), false);
  assert.equal(stateRefundsQuota("confirmed"), false);
  assert.equal(stateRefundsQuota("expired"), true);
  assert.equal(stateRefundsQuota("rejected"), true);
});

test("subtractKeys keeps only unreferenced keys", () => {
  assert.deepEqual(subtractKeys(["a", "b", "c"], new Set(["b"])), ["a", "c"]);
  assert.deepEqual(subtractKeys(["a"], []), ["a"]);
});
