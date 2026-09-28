import assert from "node:assert/strict";
import test from "node:test";

import { normalizeManagedCommit, selectManagedCommit } from "./managed-release-metadata.mjs";

test("normalizeManagedCommit accepts short and full hexadecimal SHAs", () => {
  assert.equal(normalizeManagedCommit(" 37FC65E "), "37fc65e");
  assert.equal(
    normalizeManagedCommit("37fc65e12f0bf00c1e99bd3a99f74dcc9a0d31de"),
    "37fc65e12f0bf00c1e99bd3a99f74dcc9a0d31de",
  );
});

test("normalizeManagedCommit rejects labels and malformed values", () => {
  assert.equal(normalizeManagedCommit("development"), undefined);
  assert.equal(normalizeManagedCommit("unknown"), undefined);
  assert.equal(normalizeManagedCommit("1234"), undefined);
  assert.equal(normalizeManagedCommit("zzzzzzz"), undefined);
});

test("the checked-out Git commit wins over a stale manually configured public value", () => {
  assert.equal(
    selectManagedCommit({
      gitCommit: "37fc65e",
      publicCommit: "39a1032",
    }),
    "37fc65e",
  );
});

test("provider metadata wins when available", () => {
  assert.equal(
    selectManagedCommit({
      githubCommit: "abcdef1234567",
      gitCommit: "37fc65e",
      configuredCommit: "4896be1",
    }),
    "abcdef1234567",
  );
});
