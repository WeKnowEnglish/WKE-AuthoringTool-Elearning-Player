export type ParsedModuleTitleHero = {
  highlightA: string;
  highlightB: string;
  suffix: string;
};

/**
 * Parses titles like "THERE IS / THERE ARE — QUESTIONS".
 * Returns null when the title does not use a slash pair.
 */
export function parseModuleTitleHero(moduleTitle: string): ParsedModuleTitleHero | null {
  const trimmed = moduleTitle.trim();
  const dashMatch = trimmed.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  const main = (dashMatch ? dashMatch[1] : trimmed)?.trim() ?? "";
  const suffix = dashMatch ? dashMatch[2]!.trim() : "";

  const slashParts = main.split(/\s*\/\s*/);
  if (slashParts.length !== 2) {
    return null;
  }

  const highlightA = slashParts[0]!.trim();
  const highlightB = slashParts[1]!.trim();
  if (!highlightA || !highlightB) {
    return null;
  }

  return { highlightA, highlightB, suffix };
}
