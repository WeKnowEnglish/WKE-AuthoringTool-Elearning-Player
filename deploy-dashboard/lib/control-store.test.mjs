import assert from "node:assert/strict";
import test from "node:test";

import { createControlStore, hashSecurityContext, readControlStoreConfig } from "./control-store.mjs";

test("control store configuration fails closed when either credential is missing", () => {
  assert.deepEqual(readControlStoreConfig({}).missing, [
    "CONTROL_PLANE_SUPABASE_URL",
    "CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY",
  ]);
  assert.equal(
    readControlStoreConfig({
      CONTROL_PLANE_SUPABASE_URL: "https://control.example.com",
      CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY: "secret",
    }).configured,
    true,
  );
});

test("security context hashing is stable without retaining raw values", () => {
  assert.equal(hashSecurityContext("203.0.113.7"), hashSecurityContext("203.0.113.7"));
  assert.notEqual(hashSecurityContext("203.0.113.7"), "203.0.113.7");
  assert.equal(hashSecurityContext(""), null);
});

test("audit events remove secret-shaped metadata keys", async () => {
  const calls = [];
  const store = createControlStore({
    url: "https://control.example.com",
    serviceRoleKey: "service-role",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(null, { status: 204 });
    },
  });
  await store.appendAuditEvent({
    actorLogin: "admin",
    name: "production.promote_authorized",
    outcome: "authorized",
    metadata: { commit: "a".repeat(40), token: "must-not-leak", apiKey: "must-not-leak" },
  });
  const payload = JSON.parse(calls[0].options.body);
  assert.deepEqual(payload.metadata, { commit: "a".repeat(40) });
  assert.equal(calls[0].options.headers.Authorization, "Bearer service-role");
});

test("deployment jobs use idempotent inserts and never persist secret-shaped metadata", async () => {
  const calls = [];
  const store = createControlStore({
    url: "https://control.example.com",
    serviceRoleKey: "service-role",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json([{ id: "job-1", status: "queued" }]);
    },
  });
  const result = await store.createDeploymentJob({
    organizationId: "11111111-1111-4111-8111-111111111111",
    projectId: "22222222-2222-4222-8222-222222222222",
    requestedBy: "33333333-3333-4333-8333-333333333333",
    environment: "production",
    action: "promote",
    commitSha: "a".repeat(40),
    idempotencyKey: "b".repeat(64),
    approvalsRequired: 1,
    metadata: { sourceBuildUuid: "build-1", accessToken: "do-not-store" },
  });
  assert.equal(result.created, true);
  assert.match(calls[0].url, /on_conflict=idempotency_key/);
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.approvals_required, 1);
  assert.deepEqual(payload.metadata, { sourceBuildUuid: "build-1" });
});

test("job transitions are compare-and-set operations", async () => {
  const calls = [];
  const store = createControlStore({
    url: "https://control.example.com",
    serviceRoleKey: "service-role",
    now: () => Date.parse("2026-09-30T00:00:00.000Z"),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json([{ id: "job-1", status: "running" }]);
    },
  });
  await store.transitionDeploymentJob("job-1", "authorized", "running", { provider_job_id: "hostinger-1" });
  assert.match(calls[0].url, /status=eq.authorized/);
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.status, "running");
  assert.equal(payload.started_at, "2026-09-30T00:00:00.000Z");
});

test("database sessions reject a changed user agent", async () => {
  let calls = 0;
  const store = createControlStore({
    url: "https://control.example.com",
    serviceRoleKey: "service-role",
    now: () => Date.parse("2026-09-30T00:00:00.000Z"),
    fetchImpl: async () => {
      calls += 1;
      return Response.json([{
        user_id: "user-1",
        expires_at: "2026-09-30T08:00:00.000Z",
        revoked_at: null,
        user_agent_hash: hashSecurityContext("trusted-browser"),
      }]);
    },
  });
  assert.equal(await store.getSession("session-token", { userAgent: "stolen-browser" }), null);
  assert.equal(calls, 1);
});
