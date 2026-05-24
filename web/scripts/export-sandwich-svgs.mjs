/**
 * Export Inkscape layers from ../sandwich.svg into web/public/pet/sandwich/*.svg
 * Run: node scripts/export-sandwich-svgs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SOURCE = path.join(ROOT, "sandwich.svg");
const OUT_DIR = path.join(ROOT, "web/public/pet/sandwich");

/** First matching layer label wins per export file. */
const EXPORT_MAP = [
  { file: "lettuce.svg", labels: ["lettuce"] },
  { file: "tomato.svg", labels: ["tomato"] },
  { file: "onion.svg", labels: ["onions", "onion"] },
  { file: "cheese.svg", labels: ["cheese1", "cheese 2", "cheese 3"] },
  { file: "meat.svg", labels: ["meat beef", "meat pork", "meat"] },
  { file: "chicken.svg", labels: ["chicken_burger", "chicken"] },
  { file: "mayonnaise.svg", labels: ["mayonaise", "mayonnaise"] },
  { file: "ketchup.svg", labels: ["ketchup", "catchup"] },
  { file: "hot-sauce.svg", labels: ["hot sause", "hot sauce", "hot_sauce", "hotsauce"] },
  { file: "bottom-bread.svg", labels: ["bottom_bread", "bottom bread"] },
  { file: "top-bread.svg", labels: ["top bread", "top_bread"] },
  { file: "plate.svg", labels: ["Plate", "plate"] },
];

/** Used only when the primary label is missing from the master file. */
const FALLBACK_LABELS = {
  "ketchup.svg": ["hot sause"],
  "hot-sauce.svg": ["hot sause", "mustard"],
};

function parseViewBox(svgText) {
  const m = svgText.match(/viewBox="([^"]+)"/);
  if (!m) return "0 0 132.29166 132.29167";
  return m[1];
}

function parseRootOpen(svgText) {
  const svgStart = svgText.indexOf("<svg");
  if (svgStart < 0) {
    throw new Error("No <svg> root element in sandwich.svg");
  }
  const end = svgText.indexOf(">", svgStart);
  if (end < 0) {
    throw new Error("Unclosed <svg> opening tag in sandwich.svg");
  }
  return svgText.slice(svgStart, end + 1);
}

function findLayerGroupStart(svgText, matchIndex) {
  let pos = matchIndex;
  while (pos > 0) {
    const gIdx = svgText.lastIndexOf("<g", pos);
    if (gIdx < 0) return -1;
    const snippet = svgText.slice(gIdx, matchIndex + 400);
    if (
      snippet.includes('inkscape:groupmode="layer"') &&
      /inkscape:label="[^"]*"/.test(snippet)
    ) {
      return gIdx;
    }
    pos = gIdx - 1;
  }
  return -1;
}

function extractLayers(svgText) {
  const layers = [];
  const re =
    /inkscape:groupmode="layer"[\s\S]*?inkscape:label="([^"]*)"|inkscape:label="([^"]*)"[\s\S]*?inkscape:groupmode="layer"/g;
  let match;
  while ((match = re.exec(svgText)) !== null) {
    const label = match[1] ?? match[2];
    if (!label) continue;
    const start = findLayerGroupStart(svgText, match.index);
    if (start < 0) continue;
    const isGOpen = (idx) => {
      if (!svgText.startsWith("<g", idx)) return false;
      const c = svgText[idx + 2];
      return c === " " || c === ">" || c === "\n" || c === "\r" || c === "/";
    };
    const advancePastGTag = (idx) => {
      let j = idx + 2;
      while (j < svgText.length && svgText[j] !== ">") j++;
      return j < svgText.length ? j + 1 : svgText.length;
    };
    const isSelfClosingG = (idx) => {
      let j = idx + 2;
      while (j < svgText.length && svgText[j] !== ">") j++;
      return j > idx + 2 && svgText[j - 1] === "/";
    };
    let depth = 0;
    let i = start;
    let closed = false;
    while (i < svgText.length) {
      if (isGOpen(i)) {
        if (!isSelfClosingG(i)) depth++;
        i = advancePastGTag(i);
        continue;
      }
      if (svgText.startsWith("</g>", i)) {
        depth--;
        i += 4;
        if (depth === 0) {
          layers.push({ label, content: svgText.slice(start, i) });
          closed = true;
          break;
        }
        continue;
      }
      i++;
    }
    if (!closed) {
      console.warn(`WARN: could not close layer group "${label}"`);
    }
  }
  return layers;
}

function normalizeLabel(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findLayer(layers, labelCandidates) {
  const wanted = labelCandidates.map(normalizeLabel);
  for (const layer of layers) {
    if (wanted.includes(normalizeLabel(layer.label))) {
      return layer;
    }
  }
  return null;
}

function buildSvg(rootOpen, viewBox, layerContent) {
  const inner = layerContent.replace(/\s*style="display:\s*none"/g, "");
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${rootOpen}\n  <defs id="defs-export" />\n${inner}\n</svg>\n`;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Missing sandwich.svg at repo root:", SOURCE);
    process.exit(1);
  }

  const svgText = fs.readFileSync(SOURCE, "utf8");
  const viewBox = parseViewBox(svgText);
  const rootOpen = parseRootOpen(svgText).replace(/\s*width="[^"]*"/, "").replace(
    /\s*height="[^"]*"/,
    "",
  );
  const layers = extractLayers(svgText);

  console.log(`Found ${layers.length} Inkscape layers in sandwich.svg`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const usedLabels = new Set();

  for (const spec of EXPORT_MAP) {
    let layer = findLayer(layers, spec.labels);
    let via = layer ? spec.labels.find((l) => normalizeLabel(l) === normalizeLabel(layer.label)) : null;

    if (!layer && FALLBACK_LABELS[spec.file]) {
      layer = findLayer(layers, FALLBACK_LABELS[spec.file]);
      via = layer ? `fallback:${layer.label}` : null;
    }

    if (!layer) {
      console.warn(`SKIP ${spec.file} — no layer for [${spec.labels.join(", ")}]`);
      continue;
    }

    usedLabels.add(layer.label);
    const outPath = path.join(OUT_DIR, spec.file);
    fs.writeFileSync(outPath, buildSvg(rootOpen, viewBox, layer.content), "utf8");
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`OK ${spec.file} (${kb} KB) ← "${layer.label}"${via ? ` [${via}]` : ""}`);
  }

  const unused = layers
    .map((l) => l.label)
    .filter((l) => !usedLabels.has(l) && l !== "egg");
  if (unused.length) {
    console.log("\nUnused layers (not exported):", unused.join(", "));
  }
}

main();
