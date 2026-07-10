"use server";

import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import {
  resolveSecondaryWordDisplayImageUrl,
  resolveSecondaryWordImageUrlFromRows,
  resolveSecondaryWordImageUrlSync,
} from "@/lib/secondary/secondary-word-image";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { fetchImageMediaRowsForLookup } from "@/lib/teststartpage/resolve-quiz-media";

export async function loadSecondaryWordImageUrls(
  wordItemIds: string[],
): Promise<Record<string, string | null>> {
  const uniqueIds = [...new Set(wordItemIds.filter((id) => id.trim().length > 0))];
  const result = Object.fromEntries(uniqueIds.map((id) => [id, null])) as Record<
    string,
    string | null
  >;

  if (uniqueIds.length === 0) return result;

  const items = getSecondaryVocabItemsByIds(uniqueIds);
  const needsLookup: typeof items = [];

  for (const item of items) {
    const syncUrl = resolveSecondaryWordImageUrlSync(item);
    if (syncUrl) {
      result[item.wordItemId] = syncUrl;
      continue;
    }
    result[item.wordItemId] = resolveSecondaryWordDisplayImageUrl(item);
    needsLookup.push(item);
  }

  if (needsLookup.length === 0) return result;

  const supabase = createServiceRoleSupabase();
  if (!supabase) return result;

  const mediaRows = await fetchImageMediaRowsForLookup(supabase);
  if (mediaRows.length === 0) return result;

  for (const item of needsLookup) {
    result[item.wordItemId] = resolveSecondaryWordImageUrlFromRows(item, mediaRows);
  }

  return result;
}
