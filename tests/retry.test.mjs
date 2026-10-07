import test from "node:test";
import assert from "node:assert/strict";
import {
  httpStatusFromError,
  isTransientHttpError,
  withRetry,
} from "../src/lib/retry.ts";

test("withRetry returns immediately after a successful operation", async () => {
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    return "ok";
  });
  assert.equal(value, "ok");
  assert.equal(calls, 1);
});

test("withRetry retries a transient failure and then succeeds", async () => {
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("temporary"), { statusCode: 503 });
    return "recovered";
  }, { attempts: 3, baseDelayMs: 25, maxDelayMs: 25, shouldRetry: isTransientHttpError });
  assert.equal(value, "recovered");
  assert.equal(calls, 3);
});

test("withRetry does not repeat a permanent client error", async () => {
  let calls = 0;
  await assert.rejects(() => withRetry(async () => {
    calls += 1;
    throw Object.assign(new Error("invalid"), { statusCode: 400 });
  }, { attempts: 3, shouldRetry: isTransientHttpError }), /invalid/);
  assert.equal(calls, 1);
});

test("HTTP error helpers recognise transient provider failures", () => {
  assert.equal(httpStatusFromError({ statusCode: 429 }), 429);
  assert.equal(isTransientHttpError({ statusCode: 429 }), true);
  assert.equal(isTransientHttpError({ statusCode: 503 }), true);
  assert.equal(isTransientHttpError({ statusCode: 410 }), false);
});
