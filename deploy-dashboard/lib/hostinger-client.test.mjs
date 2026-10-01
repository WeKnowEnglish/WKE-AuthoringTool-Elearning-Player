import assert from "node:assert/strict";
import test from "node:test";

import { createHostingerClient, normalizeBranch } from "./hostinger-client.mjs";

test("normalizeBranch accepts release branches and rejects traversal-like input", () => {
  assert.equal(normalizeBranch("feature/teacher-dashboard"), "feature/teacher-dashboard");
  assert.equal(normalizeBranch("release/wke-72cff39"), "release/wke-72cff39");
  assert.throws(() => normalizeBranch("../main"), /invalid/);
  assert.throws(() => normalizeBranch("feature//unsafe"), /invalid/);
});

test("Hostinger client keeps credentials server-side and builds the expected preview request", async () => {
  const calls = [];
  const client = createHostingerClient({
    token: "secret-token",
    username: "u389919369",
    fetchImplementation: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ uuid: "build-id", state: "pending" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.startGitBuild({
    domain: "preview.weknowenglish.online",
    branch: "feature/teacher-dashboard",
    installationUuid: "01a0d67f-b259-734d-90e8-a0e7337a2e3a",
    owner: "WeKnowEnglish",
    repository: "WKE-AuthoringTool-Elearning-Player",
    rootDirectory: ".",
    outputDirectory: "web/.next",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.authorization, "Bearer secret-token");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.app_type, "next");
  assert.equal(body.source_options.branch, "feature/teacher-dashboard");
  assert.equal(body.output_directory, "web/.next");
});

test("Hostinger client reads masked environment metadata without requesting secret values", async () => {
  const calls = [];
  const client = createHostingerClient({
    token: "secret-token",
    username: "u389919369",
    fetchImplementation: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify([{ key: "CRON_SECRET", value: "********" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const variables = await client.listEnvironmentVariables("weknowenglish.online");

  assert.deepEqual(variables, [{ key: "CRON_SECRET", value: "********" }]);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://developers.hostinger.com/api/hosting/v1/accounts/u389919369/websites/weknowenglish.online/nodejs/builds/settings/env",
  );
  assert.equal(calls[0].options.method, undefined);
  assert.equal(calls[0].options.headers.authorization, "Bearer secret-token");
});
