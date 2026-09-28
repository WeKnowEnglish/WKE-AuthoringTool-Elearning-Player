import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { selectManagedCommit } from "./managed-release-metadata.mjs";

const require = createRequire(import.meta.url);
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(webRoot, "..");

function readCheckedOutCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

const commit = selectManagedCommit({
  githubCommit: process.env.GITHUB_SHA,
  gitCommit: readCheckedOutCommit(),
  configuredCommit: process.env.WKE_GIT_COMMIT_SHA,
  publicCommit: process.env.NEXT_PUBLIC_GIT_COMMIT_SHA,
});

const buildEnvironment = { ...process.env };
if (commit) {
  buildEnvironment.WKE_GIT_COMMIT_SHA = commit;
  buildEnvironment.NEXT_PUBLIC_GIT_COMMIT_SHA = commit;
  console.log(`Managed release metadata: ${commit}`);
} else {
  console.warn("Managed release metadata is unavailable; /api/health will report a development release.");
}

const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  cwd: webRoot,
  env: buildEnvironment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
