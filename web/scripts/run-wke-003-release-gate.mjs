import { spawnSync } from "node:child_process";

const runs = Number.parseInt(process.env.WKE_003_GATE_RUNS ?? "3", 10);
if (!Number.isInteger(runs) || runs < 1 || runs > 3) {
  throw new Error("WKE_003_GATE_RUNS must be an integer from 1 to 3.");
}

const stages = [
  ["preflight", [process.execPath, "scripts/check-wke-003-release-env.mjs"]],
  [
    "privacy contracts",
    [
      process.execPath,
      "node_modules/vitest/vitest.mjs",
      "run",
      "lib/homework-journey/diagnostics.test.ts",
      "lib/homework-finalization/diagnostics.test.ts",
      "lib/app-diagnostics/schema.test.ts",
      "lib/homework-journey/retention-route.test.ts",
    ],
  ],
  ["retention", [process.execPath, "scripts/test-wke-003-retention.mjs"]],
  [
    `browser journey (${runs} consecutive runs per viewport)`,
    [
      process.execPath,
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config=playwright.wke-003-release.config.ts",
      `--repeat-each=${runs}`,
    ],
  ],
];

const startedAt = Date.now();
for (const [name, command] of stages) {
  console.log(`\nWKE-003 stage: ${name}`);
  if (process.env.WKE_003_FORCE_FAILURE_STAGE === name) {
    console.error(`WKE-003 gate failed at stage: ${name} (intentional dry run).`);
    process.exit(17);
  }
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    console.error(`WKE-003 gate failed at stage: ${name}.`);
    process.exit(result.status ?? 1);
  }
}

console.log(
  `\nWKE-003 advisory release gate passed in ${Math.round((Date.now() - startedAt) / 1000)} seconds.`,
);
