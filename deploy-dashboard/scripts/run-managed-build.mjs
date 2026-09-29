import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { selectDashboardCommit } from "../lib/release-metadata.mjs";

const require = createRequire(import.meta.url);

function readCheckedOutCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

const commit = selectDashboardCommit({
  gitCommit: readCheckedOutCommit(),
  githubCommit: process.env.GITHUB_SHA,
  configuredCommit: process.env.WKE_DASHBOARD_GIT_COMMIT_SHA,
});

const buildEnvironment = { ...process.env };
if (commit) {
  buildEnvironment.WKE_DASHBOARD_BUILD_COMMIT_SHA = commit;
  console.log(`Dashboard release metadata: ${commit}`);
} else {
  console.warn("Dashboard release metadata is unavailable; /api/health will report development.");
}

const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  cwd: process.cwd(),
  env: buildEnvironment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
