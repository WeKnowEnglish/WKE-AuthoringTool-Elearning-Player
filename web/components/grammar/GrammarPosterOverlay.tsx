"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { getGrammarCatalogEntry } from "@/lib/grammar-builder/load-catalog";
import { buildGrammarPosterScreens, grammarLessonId } from "@/lib/grammar-templates/build-screens";
import { playSfx } from "@/lib/audio/sfx";

const LessonPlayer = dynamic(
  () => import("@/components/lesson/LessonPlayer").then((m) => ({ default: m.LessonPlayer })),
  {
    ssr: false,
    loading: () => (
      <KidPanel className="text-center">
        <p className="text-lg font-semibold text-kid-ink">Loading grammar…</p>
      </KidPanel>
    ),
  },
);

type Props = {
  slug: string;
  sessionSeed: string;
  muted: boolean;
  onClose: () => void;
  onEconomyChange?: () => void;
  onActivityComplete?: () => void;
};

export function GrammarPosterOverlay({
  slug,
  sessionSeed,
  muted,
  onClose,
  onEconomyChange,
  onActivityComplete,
}: Props) {
  const entry = getGrammarCatalogEntry(slug);
  const exitPracticeSessionRef = useRef<(() => void) | null>(null);

  const screens = useMemo(() => {
    try {
      return buildGrammarPosterScreens(slug);
    } catch {
      return [];
    }
  }, [slug]);

  const lessonId = grammarLessonId(slug);
  const title = entry?.title ?? "Grammar";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!entry || entry.status !== "published" || screens.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[#f7bf4d] text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} grammar practice`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
        <p className="min-w-0 truncate text-sm font-extrabold uppercase tracking-wide text-kid-ink">
          {title}
        </p>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-9 shrink-0 text-sm"
          onClick={() => {
            playSfx("tap", muted);
            exitPracticeSessionRef.current?.();
            exitPracticeSessionRef.current = null;
            onClose();
          }}
        >
          Close
        </KidButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3">
        <LessonPlayer
          key={`${sessionSeed}:${slug}`}
          lessonId={lessonId}
          lessonTitle={title}
          screens={screens}
          runSeed={sessionSeed}
          grammarDifficulty={entry.difficulty}
          onPracticeSessionBind={(api) => {
            exitPracticeSessionRef.current = api.exitIfOpen;
          }}
          onGrammarFinish={() => {
            exitPracticeSessionRef.current = null;
            onActivityComplete?.();
            onClose();
          }}
          onEconomyChange={onEconomyChange}
          grammarFinishLabel="Close"
          mode="student"
          storyControlsPlacement="stage-overlay"
          immersiveLayout
        />
      </div>
    </div>
  );
}
