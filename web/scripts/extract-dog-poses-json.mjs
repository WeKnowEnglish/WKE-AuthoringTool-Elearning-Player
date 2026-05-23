import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transcriptPath =
  "C:/Users/brady/.cursor/projects/c-Education-1-We-Know-English-Center-7-Content-Creation-Lesson-Player/agent-transcripts/05a1fdfa-73c1-4b41-a1b9-c24cc0ccb1df/05a1fdfa-73c1-4b41-a1b9-c24cc0ccb1df.jsonl";

const line = fs.readFileSync(transcriptPath, "utf8").split("\n")[0];
const obj = JSON.parse(line);
const text = obj.message.content[0].text;
const marker = "Here is the JSON";
const idx = text.indexOf(marker);
const start = text.indexOf("{", idx);
let depth = 0;
let inString = false;
let escape = false;
let end = start;
for (let i = start; i < text.length; i++) {
  const ch = text[i];
  if (inString) {
    if (escape) escape = false;
    else if (ch === "\\") escape = true;
    else if (ch === '"') inString = false;
    continue;
  }
  if (ch === '"') {
    inString = true;
    continue;
  }
  if (ch === "{") depth++;
  else if (ch === "}") {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const data = JSON.parse(text.slice(start, end));
const outDir = path.join(__dirname, "..", "public", "pet");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "dog-poses.json");
fs.writeFileSync(outPath, JSON.stringify(data));
console.log("written", outPath, data.name, "scenes", data.scenes.length);
