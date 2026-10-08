import assert from "node:assert/strict";
import test from "node:test";

import {
  readAdminConfig,
  readControlPlaneConfig,
  readDeploymentContextConfig,
  readIdentityConfig,
} from "./control-config.mjs";

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
  assert.equal(result.config.previewBranch, "main");
  assert.equal(result.config.productionBranch, "main");
});

test("retired preview branches resolve to main without overriding other work branches", () => {
  for (const branch of [
    "codex/infra-002-managed-release",
    "codex/vercel-retirement",
    "codex/fix-deploy-form-origin",
  ]) {
    assert.equal(readControlPlaneConfig({
      ...completeEnvironment,
      WKE_DASHBOARD_PREVIEW_BRANCH: branch,
    }).config.previewBranch, "main");
  }
  assert.equal(readControlPlaneConfig({
    ...completeEnvironment,
    WKE_DASHBOARD_PREVIEW_BRANCH: "feat/activity-builder",
  }).config.previewBranch, "feat/activity-builder");
});

test("control-plane config reports secrets that are not configured", () => {
  const result = readControlPlaneConfig({});
  assert.equal(result.configured, false);
  assert.deepEqual(result.missing, [
    "GitHub App credentials or GITHUB_DEPLOY_TOKEN",
    "HOSTINGER_API_TOKEN",
    "WKE_HOSTINGER_USERNAME",
    "WKE_HOSTINGER_GIT_INSTALLATION_UUID",
    "WKE_GITHUB_OWNER",
    "WKE_GITHUB_REPOSITORY",
  ]);
});

test("control-plane config prefers short-lived GitHub App credentials", () => {
  const result = readControlPlaneConfig({
    ...completeEnvironment,
    GITHUB_DEPLOY_TOKEN: "",
    WKE_GITHUB_APP_ID: "12345",
    WKE_GITHUB_APP_PRIVATE_KEY: "private-key-placeholder",
    WKE_GITHUB_APP_INSTALLATION_ID: "67890",
  });
  assert.equal(result.configured, true);
  assert.equal(result.config.githubAuthentication, "app");
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

test("identity mode upgrades to GitHub only when OAuth, storage, and roles are configured", () => {
  const legacy = readIdentityConfig({
    WKE_DASHBOARD_ADMIN_PASSWORD: "correct horse battery staple",
    WKE_DASHBOARD_SESSION_SECRET: "x".repeat(32),
  });
  assert.equal(legacy.mode, "legacy");

  const github = readIdentityConfig({
    WKE_DASHBOARD_ADMIN_PASSWORD: "correct horse battery staple",
    WKE_DASHBOARD_SESSION_SECRET: "x".repeat(32),
    WKE_DASHBOARD_GITHUB_CLIENT_ID: "client-id",
    WKE_DASHBOARD_GITHUB_CLIENT_SECRET: "client-secret",
    CONTROL_PLANE_SUPABASE_URL: "https://control.example.com",
    CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY: "service-role",
    WKE_DASHBOARD_GITHUB_ROLE_MAP: JSON.stringify({ WeKnowEnglish: "owner" }),
  });
  assert.equal(github.mode, "github");
  assert.equal(github.legacyEnabled, false);
  assert.equal(github.config.roleMap.weknowenglish, "owner");
  assert.equal(github.config.requireGitHub2FA, true);
});

test("identity role map rejects unknown roles", () => {
  assert.throws(
    () => readIdentityConfig({ WKE_DASHBOARD_GITHUB_ROLE_MAP: '{"user":"superuser"}' }),
    /invalid login or role/,
  );
});

test("deployment context requires tenant UUIDs and keeps single-admin break glass off by default", () => {
  assert.deepEqual(readDeploymentContextConfig({}).missing, [
    "CONTROL_PLANE_ORGANIZATION_ID",
    "CONTROL_PLANE_PROJECT_ID",
  ]);
  const context = readDeploymentContextConfig({
    CONTROL_PLANE_ORGANIZATION_ID: "11111111-1111-4111-8111-111111111111",
    CONTROL_PLANE_PROJECT_ID: "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(context.configured, true);
  assert.equal(context.config.singleAdministratorBreakGlass, false);
});
