import test from "node:test";
import assert from "node:assert/strict";

delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const { checkRateLimit } = await import("../src/lib/rate-limit.ts");

test("local rate limiter permits the limit and rejects the next request", async () => {
  const key = `unit:${crypto.randomUUID()}`;
  assert.equal((await checkRateLimit(key, 2, 60_000)).allowed, true);
  assert.equal((await checkRateLimit(key, 2, 60_000)).allowed, true);
  const blocked = await checkRateLimit(key, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});
