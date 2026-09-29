import assert from "node:assert/strict";
import test from "node:test";

import { readAdminConfig, readControlPlaneConfig } from "./control-config.mjs";

const completeEnvironment = {
  HOSTINGER_API_TOKEN: "hostinger-token",
  WKE_HOSTINGER_USERNAME: "u389919369",
  WKE_HOSTINGER_GIT_INSTALLATION_UUID: "01a0d67f-b259-734d-90e8-a0e7337a2e3a",
  GITHUB_DEPLOY_TOKEN: "github-token",
  WKE_GITHUB_OWNER: "WeKnowEnglish",
  WKE_GITHUB_REPOSITORY: "WKE-AuthoringTool-Elearning-Player",
};

test("control-plane config applies the WKE managed-hosting defaults", () => {
  const result = readControlPlaneConfig(completeEnvironment);
  assert.equal(result.configured, true);
  assert.equal(result.config.productionDomain, "weknowenglish.online");
  assert.equal(result.config.previewDomain, "preview.weknowenglish.online");
  assert.equal(result.config.productionBranch, "main");
});

test("control-plane config reports secrets that are not configured", () => {
  const result = readControlPlaneConfig({});
  assert.equal(result.configured, false);
  assert.deepEqual(result.missing, [
    "HOSTINGER_API_TOKEN",
    "WKE_HOSTINGER_USERNAME",
    "WKE_HOSTINGER_GIT_INSTALLATION_UUID",
    "GITHUB_DEPLOY_TOKEN",
    "WKE_GITHUB_OWNER",
    "WKE_GITHUB_REPOSITORY",
  ]);
});

test("admin config enforces strong server-side credentials", () => {
  assert.throws(
    () =>
      readAdminConfig({
        WKE_DASHBOARD_ADMIN_PASSWORD: "short",
        WKE_DASHBOARD_SESSION_SECRET: "x".repeat(32),
      }),
    /at least 12/,
  );
  assert.equal(
    readAdminConfig({
      WKE_DASHBOARD_ADMIN_PASSWORD: "correct horse battery staple",
      WKE_DASHBOARD_SESSION_SECRET: "x".repeat(32),
    }).configured,
    true,
  );
});
