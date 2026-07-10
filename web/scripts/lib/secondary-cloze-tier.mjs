/** Shared cloze tier helper for Node scripts (kept in sync with secondary-cloze-coverage.ts). */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function classifyClozeTierFromFlatItem(item) {
  const frame = (item.sentenceFrame ?? "").trim();
  if (frame && /_{2,}/.test(frame)) return "A";

  const example = (item.exampleSentence ?? "").trim();
  const word = (item.word ?? "").trim();
  if (!example) return "D";

  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  if (pattern.test(example)) return "B";

  return "C";
}
