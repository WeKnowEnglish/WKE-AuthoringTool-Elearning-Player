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

function toStableIdsKey(wordItemIds: string[]): string {
  return [...new Set(wordItemIds.filter((id) => id.trim().length > 0))].sort().join(",");
}

function idsFromKey(stableKey: string): string[] {
  return stableKey.length === 0 ? [] : stableKey.split(",");
}

export function useSecondaryWordImages(wordItemIds: string[]): Record<string, string | null> {
  // Primitive content key — ignores parent array identity churn (e.g. `?? []` each render).
  const stableKey = toStableIdsKey(wordItemIds);
  const stableIds = useMemo(() => idsFromKey(stableKey), [stableKey]);
  const [urlsById, setUrlsById] = useState<Record<string, string | null>>(() =>
    seedSyncImageUrls(stableIds),
  );
  const fetchedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    setUrlsById(seedSyncImageUrls(idsFromKey(stableKey)));
  }, [stableKey]);

  useEffect(() => {
    const ids = idsFromKey(stableKey);
    if (ids.length === 0) return;
    if (fetchedKeysRef.current.has(stableKey)) return;
    fetchedKeysRef.current.add(stableKey);

    let cancelled = false;
    void loadSecondaryWordImageUrls(ids).then((resolved) => {
      if (cancelled) return;
      setUrlsById((prev) => ({ ...prev, ...resolved }));
    });

    return () => {
      cancelled = true;
    };
  }, [stableKey]);

  return urlsById;
}
