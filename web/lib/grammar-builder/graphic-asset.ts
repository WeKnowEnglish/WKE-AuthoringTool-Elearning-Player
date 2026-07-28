/** Allowed custom graphic URLs for grammar poster assets. */
export function isAllowedGrammarGraphicUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeGrammarGraphicUrl(value: string): string | undefined {
  const trimmed = value.trim();
  return isAllowedGrammarGraphicUrl(trimmed) ? trimmed : undefined;
}
