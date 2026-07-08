export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

export function getKidTitleHint(kidTitle: string | undefined): string | null {
  const words = countWords(kidTitle ?? "");
  if (words > 6) {
    return `Kid title has ${words} words (A1 guide: ≤ 6).`;
  }
  return null;
}

export function getGlanceRuleHint(text: string | undefined, difficulty: string | undefined): string | null {
  if (difficulty !== "A1") {
    return null;
  }
  const words = countWords(text ?? "");
  if (words > 8) {
    return `Glance rule has ${words} words (A1 guide: ≤ 8).`;
  }
  return null;
}

export function getColumnItemHint(
  itemCount: number,
  difficulty: string | undefined,
): string | null {
  if (difficulty === "A1" && itemCount > 1) {
    return "A1 guide: max 1 example per column.";
  }
  return null;
}
