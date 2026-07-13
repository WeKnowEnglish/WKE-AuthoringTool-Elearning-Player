const TARGET_WORD_RE = /^[a-z]+$/;

export function normalizeTargetWord(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!TARGET_WORD_RE.test(normalized)) {
    throw new Error(`Invalid deposit targetWord: "${raw}"`);
  }
  return normalized;
}

export function normalizeDepositSpelling(spelling: string): string {
  return spelling.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeHarvestAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}
