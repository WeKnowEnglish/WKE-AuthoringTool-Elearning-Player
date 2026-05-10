import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../lib/curated-sentences/master-vocabulary.ts");
const t = fs.readFileSync(file, "utf8");
const set = new Set();
for (const m of t.matchAll(/topics:\s*\[([^\]]+)\]/g)) {
  for (const part of m[1].split(",")) {
    const w = part.replace(/["']/g, "").trim();
    if (w) set.add(w);
  }
}
console.log([...set].sort().join("\n"));
