#!/usr/bin/env node
/**
 * Regenerate supabase/migrations/036_seed_live_game_question_sets.sql
 * Run: node scripts/seed-live-game-question-sets.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");

const generate = spawnSync(
  "npx",
  ["vitest", "run", "lib/live-game/server/write-seed-sql.test.ts"],
  { cwd: webRoot, stdio: "inherit", shell: true },
);
if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}
