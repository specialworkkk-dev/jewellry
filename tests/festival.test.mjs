import test from "node:test";
import assert from "node:assert/strict";

const f = await import("../src/lib/festival.ts");

test("parseIstLocal converts IST wall-clock to UTC", () => {
  assert.equal(new Date(f.parseIstLocal("2026-11-12T18:30")).toISOString(), "2026-11-12T13:00:00.000Z");
  // day boundaries: IST midnight is previous day 18:30 UTC
  assert.equal(new Date(f.parseIstLocal("2026-01-01T00:00")).toISOString(), "2025-12-31T18:30:00.000Z");
  assert.equal(new Date(f.parseIstLocal("2026-12-31T23:59")).toISOString(), "2026-12-31T18:29:00.000Z");
  assert.equal(new Date(f.parseIstLocal("2026-03-01T05:29")).toISOString(), "2026-02-28T23:59:00.000Z");
});

test("parseIstLocal rejects invalid input", () => {
  for (const bad of ["", "nope", "2026-02-30T10:00", "2026-13-01T10:00", "2026-01-01T24:00", "2026-01-01", null, undefined, 5, "2026-11-12T18:30Z"]) {
    assert.equal(f.parseIstLocal(bad), null, String(bad));
  }
  assert.notEqual(f.parseIstLocal("2028-02-29T10:00"), null);
  assert.equal(f.parseIstLocal("2027-02-29T10:00"), null);
});

test("formatIstLocal round-trips and crosses day boundaries", () => {
  assert.equal(f.formatIstLocal(Date.parse("2025-12-31T18:30:00Z")), "2026-01-01T00:00");
  assert.equal(f.formatIstLocal(Date.parse("2026-11-12T13:00:00Z")), "2026-11-12T18:30");
  const ms = f.parseIstLocal("2026-06-15T09:05");
  assert.equal(f.formatIstLocal(ms), "2026-06-15T09:05");
  assert.equal(f.formatIstLocal(NaN), "");
  assert.equal(f.formatIstDisplay(Date.parse("2026-11-12T13:00:00Z")), "12 Nov 2026, 6:30 pm IST");
  assert.equal(f.formatIstDisplay(Date.parse("2025-12-31T18:30:00Z")), "1 Jan 2026, 12:00 am IST");
});

test("parseDateInput: local is IST, absolute ISO honoured, junk rejected", () => {
  assert.equal(f.parseDateInput("2026-11-12T18:30"), Date.parse("2026-11-12T13:00:00Z"));
  assert.equal(f.parseDateInput("2026-11-12T13:00:00.000Z"), Date.parse("2026-11-12T13:00:00Z"));
  assert.equal(f.parseDateInput("2026-11-12T18:30:00+05:30"), Date.parse("2026-11-12T13:00:00Z"));
  assert.equal(f.parseDateInput("12 Nov 2026"), null);
  assert.equal(f.parseDateInput(""), null);
  assert.equal(f.parseDateInput({}), null);
});

test("countdown breakdown edges", () => {
  const z = f.countdownBreakdown(0);
  assert.deepEqual([z.days, z.hours, z.minutes, z.seconds, z.done], [0, 0, 0, 0, true]);
  assert.equal(f.countdownBreakdown(-5000).done, true);
  assert.equal(f.countdownBreakdown(NaN).totalMs, 0);
  const s59 = f.countdownBreakdown(59_000);
  assert.deepEqual([s59.minutes, s59.seconds, s59.showSeconds], [0, 59, true]);
  const h1 = f.countdownBreakdown(3_600_000);
  assert.deepEqual([h1.hours, h1.minutes, h1.showSeconds], [1, 0, false]);
  assert.equal(f.countdownBreakdown(3_599_000).showSeconds, true);
  const big = f.countdownBreakdown(45 * 86_400_000 + 3_600_000 * 5 + 60_000 * 7);
  assert.deepEqual([big.days, big.hours, big.minutes], [45, 5, 7]);
});

test("formatCountdown and spokenCountdown", () => {
  assert.equal(f.formatCountdown(2 * 86_400_000 + 4 * 3_600_000 + 12 * 60_000), "2d 04h 12m");
  assert.equal(f.formatCountdown(4 * 3_600_000 + 12 * 60_000), "4h 12m");
  assert.equal(f.formatCountdown(3_600_000), "1h 00m");
  assert.equal(f.formatCountdown(12 * 60_000 + 5000), "12m 05s");
  assert.equal(f.formatCountdown(59_000), "0m 59s");
  assert.equal(f.formatCountdown(0), "0s");
  assert.equal(f.formatCountdown(-1), "0s");
  assert.equal(f.spokenCountdown(86_400_000 + 3_600_000 + 60_000), "1 day 1 hour 1 minute");
  assert.equal(f.spokenCountdown(0), "ended");
  assert.equal(f.nextTickDelay(3_600_000), 1000);
  assert.equal(f.nextTickDelay(3_600_001), 30_000);
});

test("status transitions", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  const start = new Date(now + 1000);
  const end = new Date(now + 100_000);
  assert.equal(f.festivalStatus({ isActive: true, startsAt: start, validUntil: end }, now), "SCHEDULED");
  assert.equal(f.festivalStatus({ isActive: true, startsAt: start, validUntil: end }, now + 1000), "LIVE");
  assert.equal(f.festivalStatus({ isActive: true, validUntil: end }, now), "LIVE");
  assert.equal(f.festivalStatus({ isActive: true, validUntil: end }, now + 99_999), "LIVE");
  assert.equal(f.festivalStatus({ isActive: true, validUntil: end }, now + 100_000), "EXPIRED");
  assert.equal(f.festivalStatus({ isActive: false, validUntil: end }, now), "INACTIVE");
  assert.equal(f.festivalStatus({ isActive: false, validUntil: end }, now + 200_000), "EXPIRED");
});

test("validation rules", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  const day = 86_400_000;
  const ok = { title: "Diwali", message: "15% off making", startsAt: null, endsAt: now + day };
  assert.equal(f.validateFestivalOffer(ok, now), null);
  assert.match(f.validateFestivalOffer({ ...ok, title: "  " }, now), /Title/);
  assert.match(f.validateFestivalOffer({ ...ok, message: "" }, now), /message/);
  assert.match(f.validateFestivalOffer({ ...ok, endsAt: null }, now), /End/);
  assert.match(f.validateFestivalOffer({ ...ok, endsAt: now }, now), /future/);
  assert.match(f.validateFestivalOffer({ ...ok, endsAt: now - 1 }, now), /future/);
  assert.match(f.validateFestivalOffer({ ...ok, startsAt: now + day }, now), /before/);
  assert.match(f.validateFestivalOffer({ ...ok, startsAt: now + 2 * day }, now), /before/);
  assert.equal(f.validateFestivalOffer({ ...ok, startsAt: now + 1000 }, now), null);
  assert.equal(f.validateFestivalOffer({ ...ok, endsAt: now + 60 * day }, now), null);
  assert.match(f.validateFestivalOffer({ ...ok, endsAt: now + 60 * day + 1 }, now), /60 days/);
  // duration is measured from start when scheduled ahead
  assert.equal(f.validateFestivalOffer({ ...ok, startsAt: now + 30 * day, endsAt: now + 90 * day }, now), null);
  assert.match(f.validateFestivalOffer({ ...ok, startsAt: now + 30 * day, endsAt: now + 91 * day }, now), /60 days/);
});

test("label sanitiser and presets", () => {
  assert.equal(f.sanitizeFestivalLabel("  Di<b>wali \n\t ! "), "Di b wali !");
  assert.equal(f.sanitizeFestivalLabel("x".repeat(200)).length, 80);
  assert.equal(f.sanitizeFestivalLabel(42), "");
  assert.ok(f.FESTIVAL_PRESETS.includes("Dhanteras"));
  assert.equal(f.suggestFestivalTitle("Diwali"), "Diwali Special Offer");
  assert.equal(f.suggestFestivalTitle(" "), "");
});
