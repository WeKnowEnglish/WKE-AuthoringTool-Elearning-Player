/** Trim to a usable clip URL, or empty string when cleared. */
export function normalizeAudioClipUrl(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}
