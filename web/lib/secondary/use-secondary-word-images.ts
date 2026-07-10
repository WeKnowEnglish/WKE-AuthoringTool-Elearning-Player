"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadSecondaryWordImageUrls } from "@/lib/secondary/load-secondary-word-media-action";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import { resolveSecondaryWordDisplayImageUrl } from "@/lib/secondary/secondary-word-image";

function seedSyncImageUrls(wordItemIds: string[]): Record<string, string | null> {
  const items = getSecondaryVocabItemsByIds(wordItemIds);
  const out = Object.fromEntries(wordItemIds.map((id) => [id, null])) as Record<
    string,
    string | null
  >;

  for (const item of items) {
    out[item.wordItemId] = resolveSecondaryWordDisplayImageUrl(item);
  }

  return out;
}

export function useSecondaryWordImages(wordItemIds: string[]): Record<string, string | null> {
  const stableIds = useMemo(
    () => [...new Set(wordItemIds.filter((id) => id.trim().length > 0))].sort(),
    [wordItemIds],
  );
  const stableKey = stableIds.join(",");
  const [urlsById, setUrlsById] = useState<Record<string, string | null>>(() =>
    seedSyncImageUrls(stableIds),
  );
  const fetchedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    setUrlsById(seedSyncImageUrls(stableIds));
  }, [stableKey, stableIds]);

  useEffect(() => {
    if (stableIds.length === 0) return;
    if (fetchedKeysRef.current.has(stableKey)) return;
    fetchedKeysRef.current.add(stableKey);

    let cancelled = false;
    void loadSecondaryWordImageUrls(stableIds).then((resolved) => {
      if (cancelled) return;
      setUrlsById((prev) => ({ ...prev, ...resolved }));
    });

    return () => {
      cancelled = true;
    };
  }, [stableKey, stableIds]);

  return urlsById;
}
