import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import type { LexiconMediaRole } from "@/lib/vocabulary/lexicon-media/types";

export type LexiconMediaPreference = {
  imageUrl?: string;
  audioUrl?: string;
};

/** Scene / world art sources that should enter the media library. */
const SCENE_BRIDGE_SOURCES = new Set([
  "explore_hotspots",
  "learning_track",
  "vocabulary_list",
]);

const SCENE_MEDIA_ROLES = new Set([
  "scene",
  "background",
  "sprite",
  "prop",
]);

/**
 * Fill missing entry image/audio from preferred lexicon-linked URLs.
 * Does not overwrite media already set on the list entry.
 */
export function applyLexiconMediaPreferences(
  list: VocabularyListDocument,
  preferredByLexiconId: Readonly<Record<string, LexiconMediaPreference>>,
): VocabularyListDocument {
  let changed = false;
  const entries = list.entries.map((entry) => {
    const lexiconId = entry.sourceWordId?.trim();
    if (!lexiconId) return entry;
    const preferred = preferredByLexiconId[lexiconId];
    if (!preferred) return entry;

    let imageUrl = entry.imageUrl;
    let audioUrl = entry.audioUrl;
    if (!imageUrl?.trim() && preferred.imageUrl?.trim()) {
      imageUrl = preferred.imageUrl.trim();
      changed = true;
    }
    if (!audioUrl?.trim() && preferred.audioUrl?.trim()) {
      audioUrl = preferred.audioUrl.trim();
      changed = true;
    }
    if (imageUrl === entry.imageUrl && audioUrl === entry.audioUrl) return entry;
    return { ...entry, imageUrl, audioUrl };
  });

  return changed ? { ...list, entries } : list;
}

export function shouldBridgeStudioMetaToMediaLibrary(
  meta: Record<string, unknown>,
): boolean {
  if (typeof meta.sourceWordId === "string" && meta.sourceWordId.trim()) return true;
  if (typeof meta.word === "string" && meta.word.trim()) return true;
  if (typeof meta.source === "string" && SCENE_BRIDGE_SOURCES.has(meta.source)) {
    return true;
  }
  // Legacy hotspot uploads used `via` instead of `source`.
  if (meta.via === "explore_hotspots_workspace") return true;
  if (typeof meta.mediaRole === "string" && SCENE_MEDIA_ROLES.has(meta.mediaRole)) {
    return true;
  }
  return false;
}

export function lexiconIdFromStudioMeta(
  meta: Record<string, unknown>,
): string | null {
  if (typeof meta.sourceWordId !== "string") return null;
  const id = meta.sourceWordId.trim();
  return id.length >= 2 ? id : null;
}

export function surfaceFromStudioMeta(meta: Record<string, unknown>): string | null {
  if (typeof meta.word === "string") {
    const word = meta.word.trim().replace(/\s+/g, " ");
    if (word) return word.slice(0, 120);
  }
  if (typeof meta.alt === "string") {
    const alt = meta.alt.trim().replace(/\s+/g, " ");
    if (alt) return alt.slice(0, 120);
  }
  return null;
}

/** Library categories for search (scene art vs vocabulary art). */
export function mediaCategoriesFromStudioMeta(
  meta: Record<string, unknown>,
): string[] {
  const role =
    typeof meta.mediaRole === "string" ? meta.mediaRole.trim().toLowerCase() : "";
  if (role === "sprite") return ["sprite"];
  if (role === "prop") return ["prop"];
  if (role === "background" || role === "scene") return ["scene"];
  if (
    meta.source === "explore_hotspots" ||
    meta.via === "explore_hotspots_workspace"
  ) {
    return ["scene"];
  }
  if (meta.source === "vocabulary_list" || meta.sourceWordId) {
    return ["vocabulary"];
  }
  if (meta.source === "learning_track") return ["scene"];
  return [];
}

export function mediaTagsFromStudioMeta(meta: Record<string, unknown>): string[] {
  const tags: string[] = [];
  if (typeof meta.source === "string" && meta.source.trim()) {
    tags.push(meta.source.trim().toLowerCase().slice(0, 64));
  }
  if (meta.via === "explore_hotspots_workspace") {
    tags.push("explore_hotspots");
  }
  if (typeof meta.mediaRole === "string" && meta.mediaRole.trim()) {
    tags.push(meta.mediaRole.trim().toLowerCase().slice(0, 64));
  }
  const lexiconId = lexiconIdFromStudioMeta(meta);
  if (lexiconId) tags.push(`lex:${lexiconId}`);
  return [...new Set(tags)].slice(0, 40);
}

/**
 * Lexicon link role when a dictionary id is present.
 * Scene uploads without a word are library-only (no link).
 */
export function lexiconLinkRoleFromStudioMeta(
  meta: Record<string, unknown>,
  kind: "image" | "audio",
): LexiconMediaRole {
  if (kind === "audio") return "pronunciation";
  const role =
    typeof meta.mediaRole === "string" ? meta.mediaRole.trim().toLowerCase() : "";
  if (role === "scene" || role === "background" || role === "sprite") return "scene";
  if (role === "other" || role === "prop") return "other";
  return "illustration";
}
