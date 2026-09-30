import assert from "node:assert/strict";
import test from "node:test";

import {
  createGitHubClient,
  normalizeCommit,
  previewBranchForCommit,
  releaseBranchForCommit,
} from "./github-client.mjs";

test("release branches are deterministic and commit-specific", () => {
  assert.equal(normalizeCommit(" 72CFF398C01F "), "72cff398c01f");
  assert.equal(
    releaseBranchForCommit("72cff398c01f23dfdc7dba60c8ba3e5178205ae0"),
    "wke-release/72cff398c01f",
  );
  assert.equal(
    previewBranchForCommit("72cff398c01f23dfdc7dba60c8ba3e5178205ae0"),
    "wke-preview/72cff398c01f",
  );
  assert.throws(() => normalizeCommit("main"), /invalid/);
});

test("preview deployments resolve a branch into an immutable commit ref", async () => {
  const calls = [];
  const sha = "ad26b9b3baa3095f26834c430a4df8731336fb87";
  const client = createGitHubClient({
    token: "github-secret",
    owner: "WeKnowEnglish",
    repository: "WKE-AuthoringTool-Elearning-Player",
    fetchImplementation: async (url, options) => {
      calls.push({ url, options });
      if (options?.method === "POST") return Response.json({ ref: "created" }, { status: 201 });
      return Response.json({ sha });
    },
  });
  const result = await client.ensurePreviewBranch("feature/teacher-dashboard");
  assert.deepEqual(result, { branch: "wke-preview/ad26b9b3baa3", sha });
  assert.match(calls[0].url, /commits\/feature%2Fteacher-dashboard$/);
  assert.equal(JSON.parse(calls[1].options.body).sha, sha);
});

test("GitHub client resolves a commit and creates an immutable release branch", async () => {
  const calls = [];
  const sha = "72cff398c01f23dfdc7dba60c8ba3e5178205ae0";
  const client = createGitHubClient({
    token: "github-secret",
    owner: "WeKnowEnglish",
    repository: "WKE-AuthoringTool-Elearning-Player",
    fetchImplementation: async (url, options) => {
      calls.push({ url, options });
      if (options?.method === "POST") {
        return new Response(JSON.stringify({ ref: "refs/heads/wke-release/72cff398c01f" }), {
          status: 201,
        });
      }
      return new Response(JSON.stringify({ sha }), { status: 200 });
    },
  });

  const result = await client.ensureReleaseBranch(sha);
  assert.deepEqual(result, { branch: "wke-release/72cff398c01f", sha });
  assert.equal(calls[1].options.headers.authorization, "Bearer github-secret");
  assert.equal(JSON.parse(calls[1].options.body).ref, "refs/heads/wke-release/72cff398c01f");
});
