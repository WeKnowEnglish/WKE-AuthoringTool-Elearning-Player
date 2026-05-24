import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../sandwich.svg");
const svgText = fs.readFileSync(SOURCE, "utf8");
const re =
  /inkscape:groupmode="layer"[\s\S]*?inkscape:label="([^"]*)"|inkscape:label="([^"]*)"[\s\S]*?inkscape:groupmode="layer"/g;
let m;
const labels = [];
while ((m = re.exec(svgText))) labels.push(m[1] ?? m[2]);
console.log(labels.join("\n"));
console.log("---", labels.length);
