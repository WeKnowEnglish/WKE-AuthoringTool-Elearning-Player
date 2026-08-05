import "server-only";

/** Structured Daily logs — never log tokens, API keys, or PII beyond ids. */
export function logDaily(
  event: string,
  context: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const safe: Record<string, unknown> = { event, ...context };
  for (const key of Object.keys(safe)) {
    if (/token|secret|key|authorization/i.test(key)) {
      delete safe[key];
    }
  }
  console.info("[daily]", JSON.stringify(safe));
}
