import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeLoginAttempt,
  resetMemoryLoginAttemptsForTests,
} from "./login-rate-limit.mjs";

test("blocks attempts beyond the configured local limit", async () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  resetMemoryLoginAttemptsForTests();

  try {
    assert.equal((await consumeLoginAttempt("test-client", 2, 60_000)).allowed, true);
    assert.equal((await consumeLoginAttempt("test-client", 2, 60_000)).allowed, true);
    const blocked = await consumeLoginAttempt("test-client", 2, 60_000);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfter > 0);
  } finally {
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    resetMemoryLoginAttemptsForTests();
  }
});
