import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCommit, selectDashboardCommit } from "./release-metadata.mjs";

test("normalizeCommit accepts short and full hexadecimal commits", () => {
  assert.equal(normalizeCommit(" 72cff398c01f "), "72cff398c01f");
  assert.equal(
    normalizeCommit("72cff398c01f23dfdc7dba60c8ba3e5178205ae0"),
    "72cff398c01f23dfdc7dba60c8ba3e5178205ae0",
  );
});

test("normalizeCommit rejects labels and malformed values", () => {
  assert.equal(normalizeCommit("development"), undefined);
  assert.equal(normalizeCommit("72cff3"), undefined);
  assert.equal(normalizeCommit(undefined), undefined);
});

test("the checked-out commit wins over stale configured metadata", () => {
  assert.equal(
    selectDashboardCommit({
      gitCommit: "72cff398c01f23dfdc7dba60c8ba3e5178205ae0",
      githubCommit: "1111111111111111111111111111111111111111",
      configuredCommit: "7c2fd586e970b79d3cf84c515da8dad6279a714d",
    }),
    "72cff398c01f23dfdc7dba60c8ba3e5178205ae0",
  );
});
