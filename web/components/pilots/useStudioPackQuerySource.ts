"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export type StudioPackLoadState = {
  /** True while inbox or activity pack is loading. */
  loading: boolean;
  notice: string | null;
  /** Raw pack JSON from Activity Bank or inbox (caller parses). */
  rawPack: unknown | null;
  sourceName: string | null;
  sourceKind: "activity" | "inbox" | null;
};

/**
 * Prefer durable Activity Bank `?activity=` over ephemeral `?inbox=`.
 * Activity fetch uses cookies (teacher must be signed into Lesson Player).
 */
export function useStudioPackQuerySource(): StudioPackLoadState {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity")?.trim() || null;
  const inboxId = searchParams.get("inbox")?.trim() || null;

  const [loading, setLoading] = useState(Boolean(activityId || inboxId));
  const [notice, setNotice] = useState<string | null>(null);
  const [rawPack, setRawPack] = useState<unknown | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [sourceKind, setSourceKind] = useState<"activity" | "inbox" | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = activityId
      ? `activity:${activityId}`
      : inboxId
        ? `inbox:${inboxId}`
        : null;
    if (!key) {
      setLoading(false);
      return;
    }
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    setLoading(true);
    setNotice(null);
    setRawPack(null);
    setSourceKind(null);

    void (async () => {
      try {
        if (activityId) {
          const response = await fetch(
            `/api/studio/activities/${encodeURIComponent(activityId)}`,
            { credentials: "include" },
          );
          const payload = (await response.json()) as {
            error?: string;
            pack?: unknown;
            title?: string;
            source?: { filename?: string };
          };
          if (!response.ok) {
            throw new Error(
              payload.error ||
                (response.status === 401
                  ? "Sign in to Lesson Player as a teacher to play Activity Bank packs."
                  : "Could not load Activity Bank pack."),
            );
          }
          setRawPack(payload.pack);
          setSourceName(
            payload.source?.filename?.trim() || payload.title?.trim() || "Activity Bank",
          );
          setSourceKind("activity");
          setNotice("Loaded from My Activity Bank.");
          return;
        }

        const response = await fetch(
          `/api/dev/studio-pack-inbox/${encodeURIComponent(inboxId!)}`,
        );
        const payload = (await response.json()) as {
          error?: string;
          pack?: unknown;
          filename?: string | null;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Could not load Studio inbox pack.");
        }
        setRawPack(payload.pack);
        setSourceName(payload.filename?.trim() || "Studio inbox");
        setSourceKind("inbox");
        setNotice("Loaded from Studio inbox.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Pack load failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [activityId, inboxId]);

  return { loading, notice, rawPack, sourceName, sourceKind };
}
