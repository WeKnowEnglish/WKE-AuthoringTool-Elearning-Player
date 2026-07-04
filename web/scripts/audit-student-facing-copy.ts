/**
 * Reports likely student-facing string literals that are not yet represented in
 * `STUDENT_FACING_STATIC_COPY`.
 *
 * Run from `web/`:
 *   npm run audit:student-copy
 *   npm run audit:student-copy -- --fail-on-unregistered
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditStudentFacingStaticCopySources,
  type StaticCopySourceText,
} from "../lib/student-facing-static-copy-audit";
import { STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES } from "../lib/student-facing-static-copy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const failOnUnregistered = process.argv.includes("--fail-on-unregistered");

function toPosixPath(p: string): string {
  return p.split(path.sep).join("/");
}

function sourcePathToAbsolute(source: string): string {
  return path.join(webRoot, ...source.split(/[\\/]/));
}

function collectFiles(absPath: string): string[] {
  if (!fs.existsSync(absPath)) return [];
  const stat = fs.statSync(absPath);
  if (stat.isFile()) return /\.(?:ts|tsx)$/.test(absPath) ? [absPath] : [];
  if (!stat.isDirectory()) return [];

  const out: string[] = [];
  for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    out.push(...collectFiles(path.join(absPath, entry.name)));
  }
  return out;
}

function loadAuditedSources(): StaticCopySourceText[] {
  const seen = new Set<string>();
  const sources: StaticCopySourceText[] = [];
  for (const auditSource of STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES) {
    for (const absPath of collectFiles(sourcePathToAbsolute(auditSource.source))) {
      const rel = toPosixPath(path.relative(webRoot, absPath));
      if (seen.has(rel)) continue;
      seen.add(rel);
      sources.push({
        source: rel,
        text: fs.readFileSync(absPath, "utf8"),
      });
    }
  }
  return sources;
}

function main() {
  const sources = loadAuditedSources();
  const result = auditStudentFacingStaticCopySources({ sources });
  console.log(
    [
      `Audited source files: ${result.auditedSourceCount}`,
      `Likely student-facing literals: ${result.candidateCount}`,
      `Unregistered literals: ${result.unregisteredCount}`,
    ].join("\n"),
  );

  if (result.unregistered.length > 0) {
    console.log("\nUnregistered likely student-facing copy:");
    for (const item of result.unregistered.slice(0, 80)) {
      console.log(`- ${item.source}:${item.line} ${JSON.stringify(item.text)}`);
    }
    if (result.unregistered.length > 80) {
      console.log(`...and ${result.unregistered.length - 80} more.`);
    }
  }

  if (failOnUnregistered && result.unregistered.length > 0) {
    process.exitCode = 1;
  }
}

main();
