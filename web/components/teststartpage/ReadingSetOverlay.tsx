"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";
import {
  buildReadingSetScreens,
  getReadingSet,
  type ReadingSetId,
} from "@/lib/reading-templates";

const LessonPlayer = dynamic(
  () => import("@/components/lesson/LessonPlayer").then((m) => ({ default: m.LessonPlayer })),
  {
    ssr: false,
    loading: () => (
      <KidPanel className="text-center">
        <p className="text-lg font-semibold text-kid-ink">Loading lesson…</p>
      </KidPanel>
    ),
  },
);

export function ReadingSetOverlay({
  setId,
  sessionSeed,
  muted,
  onClose,
  onEconomyChange,
}: {
  setId: ReadingSetId;
  sessionSeed: string;
  muted: boolean;
  onClose: () => void;
  onEconomyChange?: () => void;
}) {
  const def = useMemo(() => getReadingSet(setId), [setId]);
  const screens = useMemo(
    () => buildReadingSetScreens(def, { seed: sessionSeed }),
    [def, sessionSeed],
  );
  const lessonId = `reading-${setId}`;

  const imageUrls = useMemo(
    () => [
      def.coverImageUrl,
      def.cloze.heroImageUrl,
      ...def.items.map((i) => i.imageUrl),
    ].filter((u): u is string => typeof u === "string" && u.length > 0),
    [def],
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    void prefetchImageUrls(imageUrls);
  }, [imageUrls]);

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[#f7bf4d] text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`${def.title} reading set`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
        <p className="min-w-0 truncate text-sm font-extrabold uppercase tracking-wide text-kid-ink">
          {def.title}
        </p>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-9 shrink-0 text-sm"
          onClick={() => {
            playSfx("tap", muted);
            onClose();
          }}
        >
          Close
        </KidButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3">
        <LessonPlayer
          key={`${sessionSeed}:${def.id}`}
          lessonId={lessonId}
          lessonTitle={def.title}
          screens={screens}
          runSeed={sessionSeed}
          onEconomyChange={onEconomyChange}
          mode="student"
          storyControlsPlacement="stage-overlay"
          immersiveLayout
        />
      </div>
    </div>
  );
}
