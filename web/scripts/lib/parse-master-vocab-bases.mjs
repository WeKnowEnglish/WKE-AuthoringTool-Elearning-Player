/**
 * Extract lemma -> surface (forms.base) from master-vocabulary.ts for tooling.
 * Falls back to lemma when no `forms: { base: ... }` in the same entry chunk.
 */
import fs from "node:fs";

/**
 * @param {string} tsPath absolute path to master-vocabulary.ts
 * @returns {Map<string, string>} lowercase lemma -> display surface (base form)
 */
export function parseMasterVocabLemmaToBase(tsPath) {
  const content = fs.readFileSync(tsPath, "utf8");
  /** @type {Map<string, string>} */
  const map = new Map();
  const lemmaRe = /lemma:\s*"([^"]+)"/g;
  let m;
  while ((m = lemmaRe.exec(content)) !== null) {
    const lemma = m[1];
    const start = m.index;
    const next = content.indexOf("\n    {", start + 5);
    const chunk = next === -1 ? content.slice(start) : content.slice(start, next);
    const baseMatch = /forms:\s*\{\s*base:\s*"([^"]*)"/.exec(chunk);
    const surface = baseMatch ? baseMatch[1] : lemma;
    map.set(lemma.trim().toLowerCase(), surface);
  }
  return map;
}
