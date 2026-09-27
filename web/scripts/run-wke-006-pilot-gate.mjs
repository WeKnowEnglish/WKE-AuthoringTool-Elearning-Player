import { spawnSync } from "node:child_process";

const runs = Number.parseInt(process.env.WKE_006_GATE_RUNS ?? "3", 10);
if (!Number.isInteger(runs) || runs < 1 || runs > 3) {
  throw new Error("WKE_006_GATE_RUNS must be an integer from 1 to 3.");
}

const stages = [
  ["preview and capacity preflight", [process.execPath, "scripts/check-wke-006-pilot-env.mjs"]],
  [
    "recovery, authorization, ordering, and privacy contracts",
    [
      process.execPath,
      "node_modules/vitest/vitest.mjs",
      "run",
      "lib/classroom-realtime/wke-006-pilot-env.test.ts",
      "lib/classroom-realtime/events.test.ts",
      "lib/classroom-realtime/recovery-feedback.test.ts",
      "lib/classroom-realtime/runtime-view-state.test.ts",
      "lib/classroom-realtime/rollout-env.test.ts",
      "lib/virtual-classroom/server/runtime-access.test.ts",
      "lib/virtual-classroom/server/runtime-snapshot.test.ts",
      "lib/app-diagnostics/schema.test.ts",
      "lib/app-diagnostics/platform-health.test.ts",
    ],
  ],
  [
    `teacher, mobile student, and late-join browser journey (${runs} consecutive run${runs === 1 ? "" : "s"})`,
    [
      process.execPath,
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config=playwright.wke-006-pilot.config.ts",
      `--repeat-each=${runs}`,
    ],
  ],
];

for (const [name, command] of stages) {
  console.log(`\nWKE-006 stage: ${name}`);
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    console.error(`WKE-006 gate failed at stage: ${name}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nWKE-006 preview reconnect gate passed.");
