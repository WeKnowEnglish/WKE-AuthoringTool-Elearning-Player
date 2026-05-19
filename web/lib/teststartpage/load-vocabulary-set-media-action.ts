"use server";

import { applyMediaToVocabularySet, type VocabularySetMediaResult } from "@/lib/vocabulary-templates/apply-media-to-vocabulary-set";
import { getVocabularySet } from "@/lib/vocabulary-templates/registry";
import type { VocabSetId } from "@/lib/vocabulary-templates/types";
import {
  VOCAB_SET_COVER_LOOKUP_KEYS,
  VOCAB_SET_MEDIA_TOPIC_SLUGS,
} from "@/lib/vocabulary-templates/vocab-media-topics";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  pickBestMediaUrlForKeys,
  pickBestMediaUrlForVocabWord,
} from "@/lib/teststartpage/media-asset-lookup";
import { fetchImageMediaRowsForLookup } from "@/lib/teststartpage/resolve-quiz-media";

/**
 * Resolve word + cover image URLs from `media_assets` for a hand-authored vocabulary set.
 * Without `SUPABASE_SERVICE_ROLE_KEY`, returns null URLs (placeholders in set files remain).
 */
export async function loadVocabularySetMedia(
  setId: VocabSetId,
): Promise<VocabularySetMediaResult> {
  const def = getVocabularySet(setId);
  const topicSlugs = VOCAB_SET_MEDIA_TOPIC_SLUGS[setId];
  const empty: VocabularySetMediaResult = {
    setId,
    urlsByWordId: Object.fromEntries(def.words.map((w) => [w.id, null])),
    coverUrl: null,
  };

  const supabase = createServiceRoleSupabase();
  if (!supabase) return empty;

  const mediaRows = await fetchImageMediaRowsForLookup(supabase);
  if (mediaRows.length === 0) return empty;

  const urlsByWordId: Record<string, string | null> = {};
  for (const w of def.words) {
    urlsByWordId[w.id] = pickBestMediaUrlForVocabWord(
      { id: w.id, lemma: w.lemma, topicSlugs },
      mediaRows,
    );
  }

  const coverKeys = VOCAB_SET_COVER_LOOKUP_KEYS[setId] ?? [def.title];
  const coverUrl = pickBestMediaUrlForKeys([...coverKeys], mediaRows, topicSlugs);

  return { setId, urlsByWordId, coverUrl };
}

/** Convenience: definition with library URLs applied (for server previews). */
export async function loadVocabularySetWithMedia(setId: VocabSetId) {
  const def = getVocabularySet(setId);
  const media = await loadVocabularySetMedia(setId);
  return applyMediaToVocabularySet(def, media.urlsByWordId, media.coverUrl);
}
