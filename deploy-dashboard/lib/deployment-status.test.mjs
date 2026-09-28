import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOrigin, probeDeployment } from "./deployment-status.mjs";

const fixedNow = () => new Date("2026-09-28T00:00:00.000Z");

test("normalizeOrigin accepts a clean HTTPS origin", () => {
  assert.equal(normalizeOrigin("https://preview.weknowenglish.online/"), "https://preview.weknowenglish.online");
});

test("normalizeOrigin rejects paths and credentials", () => {
  assert.throws(() => normalizeOrigin("https://user@example.com/health"));
});

test("probeDeployment recognizes a release-ready application", async () => {
  const status = await probeDeployment({
    name: "Preview",
    origin: "https://preview.weknowenglish.online",
    now: fixedNow,
    fetchImplementation: async () =>
      new Response(
        JSON.stringify({
          status: "ok",
          environment: "production",
          commit: "4896be1",
          version: "0.1.0",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });

  assert.equal(status.state, "healthy");
  assert.equal(status.releaseReady, true);
  assert.equal(status.commit, "4896be1");
});

test("probeDeployment explains Hostinger domain routing failures", async () => {
  const status = await probeDeployment({
    name: "Preview",
    origin: "https://preview.weknowenglish.online",
    now: fixedNow,
    fetchImplementation: async () =>
      new Response("Forbidden", { status: 403, headers: { "content-type": "text/html" } }),
  });

  assert.equal(status.state, "routing");
  assert.equal(status.releaseReady, false);
  assert.match(status.message, /hostname is not serving the application/i);
});

test("probeDeployment warns when commit metadata is missing", async () => {
  const status = await probeDeployment({
    name: "Production",
    origin: "https://weknowenglish.online",
    now: fixedNow,
    fetchImplementation: async () =>
      new Response(
        JSON.stringify({ status: "ok", environment: "production", commit: "development" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });

  assert.equal(status.state, "warning");
  assert.equal(status.releaseReady, false);
  assert.match(status.message, /commit metadata/i);
});

test("probeDeployment contains network failures", async () => {
  const status = await probeDeployment({
    name: "Production",
    origin: "https://weknowenglish.online",
    now: fixedNow,
    fetchImplementation: async () => {
      throw new Error("connection timed out");
    },
  });

  assert.equal(status.state, "unavailable");
  assert.equal(status.releaseReady, false);
  assert.match(status.message, /timed out/i);
});
