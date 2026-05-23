import fs from "fs";

const path =
  "C:/Users/brady/.cursor/projects/c-Education-1-We-Know-English-Center-7-Content-Creation-Lesson-Player/agent-transcripts/8234ee6b-481b-44b8-8a2f-21a323895849/8234ee6b-481b-44b8-8a2f-21a323895849.jsonl";
const line = fs.readFileSync(path, "utf8").split("\n")[0];
const obj = JSON.parse(line);
const text = obj.message.content[0].text;
const start = text.indexOf("{");
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
const jsonStr = text.slice(start, end);
const data = JSON.parse(jsonStr);
fs.mkdirSync("public/pet", { recursive: true });
fs.writeFileSync("public/pet/blender-scene.json", JSON.stringify(data));
console.log("written", data.name, "scenes", data.scenes.length);
