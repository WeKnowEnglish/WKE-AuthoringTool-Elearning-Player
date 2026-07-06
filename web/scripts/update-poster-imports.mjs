import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const targets = [
  path.join(webRoot, "lib/grammar-builder"),
  path.join(webRoot, "app"),
];

const replacements = [
  [/@\/components\/grammar\/pilot\/pilot-there-is-data/g, "@/components/grammar/poster/poster-view-model"],
  [/@\/components\/grammar\/pilot\//g, "@/components/grammar/poster/"],
  [/PilotSection/g, "PosterSection"],
  [/PilotHeroData/g, "PosterHeroData"],
  [/PilotExample/g, "PosterExample"],
  [/GrammarPilotPage/g, "GrammarPosterPage"],
  [/GrammarPilotLayoutsPage/g, "GrammarPosterLayoutsPage"],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      let content = fs.readFileSync(full, "utf8");
      let changed = false;
      for (const [pattern, replacement] of replacements) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, content);
    }
  }
}

for (const target of targets) walk(target);
console.log("Updated lib and app imports to poster");
