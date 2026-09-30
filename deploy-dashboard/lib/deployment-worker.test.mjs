import assert from "node:assert/strict";
import test from "node:test";

import { readWorkerConfig, workerRequestAuthorized } from "./deployment-worker-auth.mjs";

test("worker configuration requires a strong secret", () => {
  assert.equal(readWorkerConfig({}).configured, false);
  assert.throws(() => readWorkerConfig({ WKE_DEPLOY_WORKER_SECRET: "short" }), /32 characters/);
  assert.equal(readWorkerConfig({ WKE_DEPLOY_WORKER_SECRET: "x".repeat(32) }).configured, true);
});

test("worker authorization requires an exact bearer secret", () => {
  const secret = "s".repeat(32);
  assert.equal(workerRequestAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(workerRequestAuthorized(`Bearer ${"x".repeat(32)}`, secret), false);
  assert.equal(workerRequestAuthorized(null, secret), false);
});
