"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PictureClozePlayer } from "@/components/picture-cloze/PictureClozePlayer";
import {
  createSamplePictureClozeDocument,
  resolvePictureClozeFromBankPayload,
  toPictureClozePlayable,
  type PictureClozeDocument,
} from "@/lib/picture-cloze";

export function PictureClozePilot() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity")?.trim() || null;
  const [document, setDocument] = useState<PictureClozeDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(activityId));

  useEffect(() => {
    if (!activityId) {
      setDocument(createSamplePictureClozeDocument());
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/studio/activities/${encodeURIComponent(activityId)}`,
          { credentials: "include" },
        );
        const payload = (await response.json()) as {
          error?: string;
          pack?: unknown;
          authoring?: unknown;
          title?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Could not load Activity Bank item.");
        }
        if (cancelled) return;
        setDocument(
          resolvePictureClozeFromBankPayload({
            pack: payload.pack,
            authoring: payload.authoring,
          }),
        );
        setNotice(
          `Loaded from My Activity Bank${payload.title ? `: ${payload.title}` : ""}.`,
        );
      } catch (error) {
        if (cancelled) return;
        setDocument(createSamplePictureClozeDocument());
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not load bank item — showing sample.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  if (loading || !document) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
        Opening picture cloze…
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#eff8ff_0%,#fff9ed_100%)] px-3 py-5 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl border-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
          <Link href="/pilots" className="text-xs font-bold text-sky-700 hover:underline">
            ← Pilots
          </Link>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#17375e]">
            Picture cloze
          </h1>
          <p className="text-sm font-semibold text-slate-600">
            Standalone vocab module — generate from a list, save to Activity Bank, assign as
            homework.
          </p>
          {notice ? (
            <p className="mt-2 text-xs font-bold text-emerald-800">{notice}</p>
          ) : null}
        </header>
        <PictureClozePlayer activity={toPictureClozePlayable(document)} />
      </div>
    </main>
  );
}
