import fs from "node:fs";
import path from "node:path";
import { generateTopicSnapshot } from "../lib/quiz-builder-snapshot";

const topics = ["food", "school", "daily_life", "body_parts"] as const;
const output: Record<string, unknown> = {};

for (const topic of topics) {
  const snap = generateTopicSnapshot({
    topic,
    level: "A1",
    strictTopic: true,
  });
  output[topic] = snap;

  console.log(`\n=== ${topic.toUpperCase()} ===`);
  console.log(`Structures: ${snap.eligibleStructures}`);
  console.log(`Density: ${snap.totalDensity}`);

  for (const s of snap.structures) {
    console.log(`${s.id} | ${s.health} | compatible=${s.compatibleCount} | density=${s.density}`);
  }

  const top = snap.dominance[0];
  if (top && top.ratio > 0.4) {
    console.log(`Dominance: ${top.template} (${top.ratio.toFixed(2)})`);
  }
}

const dir = path.join(process.cwd(), "tmp/quiz-snapshots");
fs.mkdirSync(dir, { recursive: true });

const file = path.join(dir, `snapshot-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(output, null, 2), "utf8");

console.log(`\nSaved -> ${file}`);
