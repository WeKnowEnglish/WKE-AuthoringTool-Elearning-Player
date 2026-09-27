import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import {
  evaluateReleaseHealth,
  normalizeCommit,
  normalizeDeploymentOrigin,
} from "./hostinger-release-core.mjs";

function integerSetting(name, fallback, minimum, maximum) {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

const origin = normalizeDeploymentOrigin(process.env.WKE_DEPLOYMENT_ORIGIN);
const expectedCommit = normalizeCommit(process.env.WKE_EXPECTED_GIT_COMMIT_SHA);
const timeoutSeconds = integerSetting("WKE_DEPLOYMENT_TIMEOUT_SECONDS", 1_200, 30, 3_600);
const pollSeconds = integerSetting("WKE_DEPLOYMENT_POLL_SECONDS", 15, 2, 300);
const requiredHealthyChecks = integerSetting("WKE_REQUIRED_HEALTHY_CHECKS", 2, 1, 10);
const deadline = Date.now() + timeoutSeconds * 1_000;
let attempt = 0;
let consecutiveHealthyChecks = 0;
let lastReason = "deployment has not been checked";

process.stdout.write(
  `Waiting for ${origin} to report release ${expectedCommit.slice(0, 12)} ` +
    `(${requiredHealthyChecks} consecutive healthy checks required).\n`,
);

while (Date.now() < deadline) {
  attempt += 1;
  try {
    const response = await fetch(`${origin}/api/health`, {
      cache: "no-store",
      headers: { "user-agent": "wke-release-controller/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      consecutiveHealthyChecks = 0;
      lastReason = `/api/health returned HTTP ${response.status}`;
    } else {
      const payload = await response.json();
      const result = evaluateReleaseHealth(payload, expectedCommit);
      lastReason = result.reason;
      consecutiveHealthyChecks = result.ready ? consecutiveHealthyChecks + 1 : 0;
    }
  } catch (error) {
    consecutiveHealthyChecks = 0;
    lastReason = error instanceof Error ? error.message : String(error);
  }

  process.stdout.write(
    `Attempt ${attempt}: ${lastReason}; healthy ${consecutiveHealthyChecks}/${requiredHealthyChecks}.\n`,
  );

  if (consecutiveHealthyChecks >= requiredHealthyChecks) {
    process.stdout.write(
      `Release ${expectedCommit.slice(0, 12)} is ready at ${origin}. Production promotion may continue.\n`,
    );
    process.exit(0);
  }

  if (Date.now() + pollSeconds * 1_000 >= deadline) break;
  await sleep(pollSeconds * 1_000);
}

process.stderr.write(
  `Release ${expectedCommit.slice(0, 12)} did not become ready at ${origin} within ` +
    `${timeoutSeconds} seconds. Last result: ${lastReason}. Production must remain on the previous release.\n`,
);
process.exit(1);

