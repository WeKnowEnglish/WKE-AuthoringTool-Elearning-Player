import { normalizeLexiconSurface } from "./normalize";
import type { UnifiedVocabSearchEntry } from "./types";

export type SheetSurfaceResolve =
  | { status: "empty" }
  | { status: "found"; entry: UnifiedVocabSearchEntry }
  | { status: "ambiguous"; entries: UnifiedVocabSearchEntry[] }
  | { status: "missing"; surface: string; normalized: string };

/**
 * Resolve a typed pack-sheet surface against the unified dictionary.
 * Prefers exact normalized-lemma matches; ambiguous when multiple senses remain.
 */
export function resolveSheetSurface(
  raw: string,
  entries: readonly UnifiedVocabSearchEntry[],
  options?: { excludeIds?: ReadonlySet<string> },
): SheetSurfaceResolve {
  const surface = raw.trim();
  if (!surface) return { status: "empty" };

  const normalized = normalizeLexiconSurface(surface);
  const exclude = options?.excludeIds;

  let matches = entries.filter((e) => e.normalizedLemma === normalized);
  if (exclude && exclude.size > 0) {
    const notInPack = matches.filter((e) => !exclude.has(e.id));
    if (notInPack.length > 0) matches = notInPack;
  }

  if (matches.length === 0) {
    // Soft fallback: unique lemma prefix / includes only when a single hit.
    const soft = entries.filter(
      (e) =>
        e.normalizedLemma === normalized ||
        e.lemma.toLowerCase() === surface.toLowerCase(),
    );
    const softFiltered =
      exclude && exclude.size > 0
        ? soft.filter((e) => !exclude.has(e.id)).length > 0
          ? soft.filter((e) => !exclude.has(e.id))
          : soft
        : soft;
    if (softFiltered.length === 1) {
      return { status: "found", entry: softFiltered[0]! };
    }
    if (softFiltered.length > 1) {
      return { status: "ambiguous", entries: softFiltered.slice(0, 8) };
    }
    return { status: "missing", surface, normalized };
  }

  if (matches.length === 1) {
    return { status: "found", entry: matches[0]! };
  }
  return { status: "ambiguous", entries: matches.slice(0, 8) };
}
