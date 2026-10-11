import test from "node:test";
import assert from "node:assert/strict";

const {
  validatePollInput, computeEndsAt, resolveWinner, votePercentages, pollPhase, timeLeftLabel,
  featuredUntil, isFeaturedNow, storefrontVisibility, formatIst, insightHint, FEATURE_DAYS,
} = await import("../src/lib/design-poll.ts");

const ids = (n) => Array.from({ length: n }, (_, i) => (i + 1).toString(16).padStart(24, "a"));

test("validation: candidate count 2..6", () => {
  assert.equal(validatePollInput({ productIds: ids(1) }).ok, false);
  assert.equal(validatePollInput({ productIds: ids(2) }).ok, true);
  assert.equal(validatePollInput({ productIds: ids(6) }).ok, true);
  assert.equal(validatePollInput({ productIds: ids(7) }).ok, false);
  assert.equal(validatePollInput({}).ok, false);
  assert.equal(validatePollInput({ productIds: "x" }).ok, false);
});

test("validation: ids must be unique valid object ids, order kept, lower-cased", () => {
  const [a, b] = ids(2);
  assert.equal(validatePollInput({ productIds: [a, a] }).ok, false);
  assert.equal(validatePollInput({ productIds: [a, "nope"] }).ok, false);
  assert.equal(validatePollInput({ productIds: [a, 5] }).ok, false);
  assert.equal(validatePollInput({ productIds: [a, { $ne: 1 }] }).ok, false);
  const r = validatePollInput({ productIds: [b, a.toUpperCase()] });
  assert.deepEqual(r.productIds, [b, a]);
});

test("validation: duration 3..14 default 7, whole days only", () => {
  const productIds = ids(2);
  assert.equal(validatePollInput({ productIds }).durationDays, 7);
  assert.equal(validatePollInput({ productIds, durationDays: 3 }).durationDays, 3);
  assert.equal(validatePollInput({ productIds, durationDays: "14" }).durationDays, 14);
  for (const bad of [2, 15, 0, -1, 3.5, "abc", "7.5", NaN, Infinity, true, [], {}]) {
    assert.equal(validatePollInput({ productIds, durationDays: bad }).ok, false, String(bad));
  }
});

test("validation: title default, trimming, 80 max", () => {
  const productIds = ids(2);
  assert.equal(validatePollInput({ productIds }).title, "Design of the Week");
  assert.equal(validatePollInput({ productIds, title: "   " }).title, "Design of the Week");
  assert.equal(validatePollInput({ productIds, title: "  Diwali   picks " }).title, "Diwali picks");
  assert.equal(validatePollInput({ productIds, title: "x".repeat(80) }).ok, true);
  assert.equal(validatePollInput({ productIds, title: "x".repeat(81) }).ok, false);
  assert.equal(validatePollInput({ productIds, title: 5 }).ok, false);
});

test("ends at an exact instant", () => {
  const now = Date.parse("2026-10-11T10:00:00Z");
  assert.equal(computeEndsAt(now, 7).toISOString(), "2026-10-18T10:00:00.000Z");
});

test("winner: most votes, tie to earliest, zero votes none", () => {
  assert.equal(resolveWinner([{ productId: "a", votes: 1 }, { productId: "b", votes: 5 }, { productId: "c", votes: 2 }]), "b");
  assert.equal(resolveWinner([{ productId: "a", votes: 3 }, { productId: "b", votes: 3 }]), "a");
  assert.equal(resolveWinner([{ productId: "a", votes: 2 }, { productId: "b", votes: 4 }, { productId: "c", votes: 4 }]), "b");
  assert.equal(resolveWinner([{ productId: "a", votes: 0 }, { productId: "b", votes: 0 }]), null);
  assert.equal(resolveWinner([]), null);
  assert.equal(resolveWinner([{ productId: "a", votes: NaN }, { productId: "b", votes: 1 }]), "b");
});

test("percentages sum to 100 and handle zero votes", () => {
  assert.deepEqual(votePercentages([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(votePercentages([]), []);
  assert.deepEqual(votePercentages([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(votePercentages([5, 0]), [100, 0]);
  for (const votes of [[1, 2, 4], [7, 7, 7, 7, 7, 7], [1, 1], [13, 29, 3, 0, 55], [999, 1]]) {
    const p = votePercentages(votes);
    assert.equal(p.reduce((a, b) => a + b, 0), 100, JSON.stringify(votes));
    p.forEach((value, i) => assert.ok(value >= 0 && (votes[i] > 0 || value === 0)));
  }
  assert.deepEqual(votePercentages([-3, 2]), [0, 100]);
});

test("phase and time left", () => {
  const now = Date.parse("2026-10-11T10:00:00Z");
  const at = (ms) => new Date(now + ms);
  assert.equal(pollPhase({ status: "ACTIVE", endsAt: at(1000) }, now), "ACTIVE");
  assert.equal(pollPhase({ status: "ACTIVE", endsAt: at(0) }, now), "AWAITING_CLOSE");
  assert.equal(pollPhase({ status: "ACTIVE", endsAt: at(-1) }, now), "AWAITING_CLOSE");
  assert.equal(pollPhase({ status: "CLOSED", endsAt: at(1e9) }, now), "CLOSED");
  assert.equal(pollPhase({ status: "ACTIVE", endsAt: "garbage" }, now), "AWAITING_CLOSE");
  const H = 3600e3;
  assert.equal(timeLeftLabel(at(3 * 24 * H + 4 * H + 5 * 60e3), now), "Ends in 3d 4h");
  assert.equal(timeLeftLabel(at(5 * H + 12 * 60e3), now), "Ends in 5h 12m");
  assert.equal(timeLeftLabel(at(12 * 60e3 + 5), now), "Ends in 12m");
  assert.equal(timeLeftLabel(at(30e3), now), "Ending soon");
  assert.equal(timeLeftLabel(at(0), now), "Ended");
  assert.equal(timeLeftLabel(at(-5), now), "Ended");
  assert.equal(timeLeftLabel("garbage", now), "Ended");
});

test("7-day featuring window", () => {
  const closed = Date.parse("2026-10-11T10:00:00Z");
  const D = 24 * 3600e3;
  assert.equal(FEATURE_DAYS, 7);
  assert.equal(featuredUntil(closed).getTime(), closed + 7 * D);
  assert.equal(isFeaturedNow(closed, closed), true);
  assert.equal(isFeaturedNow(closed, closed + 7 * D - 1), true);
  assert.equal(isFeaturedNow(closed, closed + 7 * D), false);
  assert.equal(isFeaturedNow(closed, closed - 1), false);
  assert.equal(isFeaturedNow(null, closed), false);
  assert.equal(isFeaturedNow("garbage", closed), false);
});

test("storefront visibility", () => {
  const now = Date.parse("2026-10-11T10:00:00Z");
  const D = 24 * 3600e3;
  const base = { endsAt: new Date(now - D) };
  assert.equal(storefrontVisibility({ status: "ACTIVE", endsAt: new Date(now + 1000) }, now), "VOTING");
  assert.equal(storefrontVisibility({ ...base, status: "ACTIVE" }, now), "HIDDEN");
  assert.equal(storefrontVisibility({ ...base, status: "CLOSED", closedAt: new Date(now - D), winnerProductId: "a" }, now), "WINNER");
  assert.equal(storefrontVisibility({ ...base, status: "CLOSED", closedAt: new Date(now - D), winnerProductId: null }, now), "HIDDEN");
  assert.equal(storefrontVisibility({ ...base, status: "CLOSED", closedAt: new Date(now - 8 * D), winnerProductId: "a" }, now), "HIDDEN");
});

test("IST formatting", () => {
  assert.match(formatIst(Date.parse("2026-10-11T13:00:00Z")), /^11 Oct, 6:30 pm IST$/);
  assert.equal(formatIst("garbage"), "");
});

test("insight hint", () => {
  const row = (productId, name, votes, whatsappClicks = 0) => ({ productId, name, votes, views: 0, saves: 0, whatsappClicks });
  assert.match(insightHint([]), /No votes yet/);
  assert.match(insightHint([row("a", "A", 0), row("b", "B", 0)]), /No votes yet/);
  assert.match(insightHint([row("a", "A", 5, 3), row("b", "B", 1, 1)]), /leads the votes and also drives/);
  assert.match(insightHint([row("a", "A", 5, 0), row("b", "B", 1, 4)]), /"B" got more WhatsApp/);
  assert.match(insightHint([row("a", "A", 5)]), /consider a post or offer/);
});
