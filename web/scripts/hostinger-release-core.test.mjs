import assert from "node:assert/strict";
import test from "node:test";
import {
  commitsMatch,
  evaluateReleaseHealth,
  normalizeCommit,
  normalizeDeploymentOrigin,
} from "./hostinger-release-core.mjs";

test("normalizes an HTTPS deployment origin", () => {
  assert.equal(
    normalizeDeploymentOrigin(" https://preview.weknowenglish.online/ "),
    "https://preview.weknowenglish.online",
  );
  assert.throws(() => normalizeDeploymentOrigin("http://preview.example.com"), /HTTPS origin/);
  assert.throws(() => normalizeDeploymentOrigin("https://example.com/path"), /without a path/);
});

test("accepts full and short hexadecimal commit identifiers", () => {
  assert.equal(normalizeCommit(" 5B1DA3375357AA61 "), "5b1da3375357aa61");
  assert.equal(commitsMatch("5b1da33", "5b1da3375357aa61"), true);
  assert.equal(commitsMatch("5b1da3375357aa61", "5b1da33"), true);
  assert.equal(commitsMatch("5b1da33", "6a1dd1e"), false);
  assert.throws(() => normalizeCommit("main"), /commit SHA/);
});

test("requires the expected healthy production release", () => {
  assert.deepEqual(
    evaluateReleaseHealth(
      { status: "ok", environment: "production", commit: "5b1da3375357aa61" },
      "5b1da33",
    ),
    { ready: true, reason: "expected release is healthy" },
  );
  assert.equal(
    evaluateReleaseHealth(
      { status: "ok", environment: "production", commit: "development" },
      "5b1da33",
    ).ready,
    false,
  );
  assert.equal(
    evaluateReleaseHealth(
      { status: "ok", environment: "production", commit: "6a1dd1e" },
      "5b1da33",
    ).ready,
    false,
  );
  assert.equal(
    evaluateReleaseHealth(
      { status: "starting", environment: "production", commit: "5b1da33" },
      "5b1da33",
    ).ready,
    false,
  );
});

