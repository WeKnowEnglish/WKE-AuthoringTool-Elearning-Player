/**
 * Count how many keywords appear in student text (case-insensitive, word-boundary-ish).
 */

export function countKeywordMatchesInText(
  studentText: string,
  keywords: string[],
): { matched: number; total: number } {
  const total = keywords.length;
  if (total === 0) return { matched: 0, total: 0 };
  const lower = studentText.toLowerCase();
  let matched = 0;
  for (const kw of keywords) {
    const k = kw.trim().toLowerCase();
    if (!k) continue;
    const re = new RegExp(
      `\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    );
    if (re.test(lower)) matched += 1;
  }
  return { matched, total };
}
