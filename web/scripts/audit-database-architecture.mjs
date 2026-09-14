import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  analyzeSnapshot,
  assertMetadataOnlySql,
  summarizeSnapshot,
  validateRegistry,
} from "./database-architecture-audit-core.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const registryPath = join(projectDir, "docs", "database", "learning-critical-registry.json");
const snapshotSqlPath = join(projectDir, "scripts", "database-architecture-snapshot.sql");
const migrationsDir = join(projectDir, "supabase", "migrations");
const cliScriptPath = join(projectDir, "node_modules", "supabase", "dist", "supabase.js");

function optionValue(name) {
  const exact = process.argv.indexOf(name);
  if (exact >= 0) return process.argv[exact + 1] || null;
  const prefix = name + "=";
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMigrationVersion() {
  const versions = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.match(/^(\d+)_/)?.[1])
    .filter(Boolean)
    .sort((left, right) => Number(left) - Number(right));
  return versions.at(-1) || null;
}

function parseCliSnapshot(stdout) {
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new Error("Supabase CLI returned no JSON payload.");
  const payload = JSON.parse(stdout.slice(jsonStart));
  const value = payload.rows?.[0]?.snapshot;
  if (!value) throw new Error("Supabase CLI returned no architecture snapshot row.");
  return typeof value === "string" ? JSON.parse(value) : value;
}

function linkedSnapshot(sql) {
  if (!existsSync(cliScriptPath)) {
    throw new Error("Pinned Supabase CLI is unavailable. Run npm install first.");
  }
  const tempDir = mkdtempSync(join(tmpdir(), "wke-database-architecture-"));
  const queryPath = join(tempDir, "snapshot.sql");
  writeFileSync(queryPath, sql, "utf8");
  try {
    const result = spawnSync(
      process.execPath,
      [cliScriptPath, "db", "query", "--linked", "--file", queryPath, "--output", "json"],
      { cwd: projectDir, encoding: "utf8", windowsHide: true },
    );
    if (result.status !== 0) {
      throw new Error(
        result.stderr ||
          result.stdout ||
          result.error?.message ||
          "Linked architecture query failed.",
      );
    }
    return parseCliSnapshot(result.stdout);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function printFindings(findings) {
  if (findings.length === 0) {
    console.log("No architecture findings.");
    return;
  }
  const sorted = [...findings].sort(
    (left, right) =>
      Number(right.blocking) - Number(left.blocking) ||
      left.severity.localeCompare(right.severity) ||
      left.code.localeCompare(right.code) ||
      left.subject.localeCompare(right.subject),
  );
  for (const finding of sorted) {
    const disposition = finding.blocking ? "BLOCKING" : "ADVISORY";
    console.log(
      "[" + disposition + " " + finding.severity + "] " + finding.code +
        " — " + finding.subject + ": " + finding.message,
    );
  }
}

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const sql = readFileSync(snapshotSqlPath, "utf8");
assertMetadataOnlySql(sql);

const registryOnly = process.argv.includes("--registry-only");
const snapshotFile = optionValue("--snapshot");
const reportFile = optionValue("--json-report");
const snapshot =
  snapshotFile ? JSON.parse(readFileSync(resolve(projectDir, snapshotFile), "utf8"))
  : registryOnly ? null
  : linkedSnapshot(sql);

const pathExists = (relativePath) =>
  existsSync(resolve(projectDir, String(relativePath).replaceAll("/", "\\")));
const registryFindings = validateRegistry(registry, {
  snapshot,
  latestMigration: latestMigrationVersion(),
  pathExists,
});
const criticalObjects = new Set(
  registry.objects.filter((entry) => entry.kind === "table").map((entry) => entry.name),
);
const schemaFindings = snapshot ? analyzeSnapshot(snapshot, { criticalObjects }) : [];
const findings = [...registryFindings, ...schemaFindings];
const blocking = findings.filter((finding) => finding.blocking);

console.log(
  "Registry: " + registry.objects.length + " learning-critical objects across " +
    new Set(registry.objects.flatMap((entry) => entry.journeys)).size + " journeys.",
);
console.log("Registry reviewed through migration " + registry.reviewedThroughMigration + ".");
if (snapshot) {
  const counts = summarizeSnapshot(snapshot);
  console.log(
    "Linked metadata: " + counts.tablesAndViews + " tables/views, " +
      counts.functions + " functions, " + counts.triggers + " triggers, " +
      counts.foreignKeys + " foreign keys, " + counts.indexes + " indexes, " +
      counts.policies + " policies.",
  );
}
printFindings(findings);

if (reportFile) {
  const outputPath = resolve(projectDir, reportFile);
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        registryVersion: registry.version,
        reviewedThroughMigration: registry.reviewedThroughMigration,
        inventory: snapshot ? summarizeSnapshot(snapshot) : null,
        findings,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log("JSON report written to " + outputPath + ".");
}

if (blocking.length > 0) {
  console.error(
    "Database architecture audit failed with " + blocking.length + " blocking finding(s).",
  );
  process.exit(1);
}
console.log("Database architecture audit passed (advisories may remain).");
