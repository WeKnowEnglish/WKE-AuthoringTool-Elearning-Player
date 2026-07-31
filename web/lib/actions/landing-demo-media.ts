"use server";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { pickBestMediaUrlForVocabWord } from "@/lib/teststartpage/media-asset-lookup";
import { fetchImageMediaRowsForLookup } from "@/lib/teststartpage/resolve-quiz-media";
import type { MediaRow } from "@/lib/teststartpage/media-asset-lookup";

export type LandingDemoMediaMatch = {
  imageUrl: string | null;
  audioUrl: string | null;
};

/**
 * Read-only media matching for the anonymous homepage sandbox.
 * The result is deliberately capped and exposes only existing public asset URLs.
 */
export async function resolveLandingDemoMedia(words: string[]): Promise<Record<string, LandingDemoMediaMatch>> {
  const normalized = words
    .slice(0, 6)
    .map((word) => word.trim().slice(0, 60))
    .filter(Boolean);
  const empty = Object.fromEntries(normalized.map((word) => [word, { imageUrl: null, audioUrl: null }]));
  const supabase = createServiceRoleSupabase();
  if (!supabase || normalized.length === 0) return empty;

  const mediaRows = await fetchImageMediaRowsForLookup(supabase);
  const { data: audioData } = await supabase
    .from("media_assets")
    .select("public_url, meta_item_name, meta_categories, meta_tags, meta_alternative_names, original_filename, created_at")
    .like("content_type", "audio/%")
    .order("created_at", { ascending: false })
    .limit(900);
  const audioRows = (audioData ?? []) as MediaRow[];
  if (mediaRows.length === 0 && audioRows.length === 0) return empty;

  return Object.fromEntries(normalized.map((word) => [
    word,
    {
      imageUrl: pickBestMediaUrlForVocabWord(
        { id: word.toLowerCase().replace(/\s+/g, "_"), lemma: word },
        mediaRows,
      ),
      audioUrl: pickBestMediaUrlForVocabWord(
        { id: word.toLowerCase().replace(/\s+/g, "_"), lemma: word },
        audioRows,
      ),
    },
  ]));
}
