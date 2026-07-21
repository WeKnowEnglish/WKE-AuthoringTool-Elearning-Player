import type { PlatformLexiconEntry } from "@/lib/vocabulary/platform-lexicon";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";

/**
 * Overlay published platform definitions onto resolved pack rows.
 * Static Primary search index has no EN/VI defs; teacher rows already carry theirs.
 */
export function hydratePackLexemeDefinitions(
  lexemes: readonly PackLexemeResolution[],
  platformEntries: readonly PlatformLexiconEntry[],
): PackLexemeResolution[] {
  const byId = new Map(platformEntries.map((e) => [e.id, e]));

  return lexemes.map((row) => {
    if (row.definitionEn?.trim()) return row;

    const platform =
      byId.get(row.id) ??
      (row.promotedToId ? byId.get(row.promotedToId) : undefined);
    if (!platform) return row;

    const definitionEn = platform.learnerDefinitionEn?.trim() || null;
    const definitionVi = platform.learnerMeaningVi?.trim() || null;
    if (!definitionEn && !definitionVi) return row;

    return {
      ...row,
      definitionEn: definitionEn ?? row.definitionEn ?? null,
      definitionVi: definitionVi ?? row.definitionVi ?? null,
    };
  });
}
