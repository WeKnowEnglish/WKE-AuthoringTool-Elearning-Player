"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  buildVocabularyPracticeContext,
  buildVocabularySetScreens,
  getVocabularySet,
  practiceWordsInSessionOrder,
  type VocabSetId,
} from "@/lib/vocabulary-templates";
import { DEFAULT_PRACTICE_COUNT } from "@/lib/vocabulary-templates/types";
import { playSfx } from "@/lib/audio/sfx";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";

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

export function VocabularySetOverlay({
  setId,
  sessionSeed,
  muted,
  onClose,
  onRequestNewRun,
}: {
  setId: VocabSetId;
  sessionSeed: string;
  muted: boolean;
  onClose: () => void;
  onRequestNewRun: () => void;
}) {
  const def = getVocabularySet(setId);
  const lessonId = `vocab-${setId}`;

  const screens = useMemo(
    () =>
      buildVocabularySetScreens(def, {
        seed: sessionSeed,
        practiceCount: DEFAULT_PRACTICE_COUNT,
      }),
    [def, sessionSeed],
  );

  const vocabWordsById = useMemo(
    () =>
      Object.fromEntries(
        def.words.map((w) => [
          w.id,
          { id: w.id, lemma: w.lemma, grammar: w.grammar, mealVerb: w.mealVerb },
        ]),
      ),
    [def.words],
  );

  const vocabPracticeWords = useMemo(() => {
    const ctx = buildVocabularyPracticeContext(def, {
      seed: sessionSeed,
      practiceCount: DEFAULT_PRACTICE_COUNT,
    });
    return practiceWordsInSessionOrder(ctx).map((w) => ({
      id: w.id,
      lemma: w.lemma,
      imageUrl: w.imageUrl,
    }));
  }, [def, sessionSeed]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    void prefetchImageUrls([def.coverImageUrl, ...def.words.map((w) => w.imageUrl)]);
  }, [def.id, def.coverImageUrl, def.words]);

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[#f7bf4d] text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`${def.title} vocabulary set`}
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
          key={sessionSeed}
          lessonId={lessonId}
          lessonTitle={def.title}
          screens={screens}
          runSeed={sessionSeed}
          vocabWordsById={vocabWordsById}
          vocabPracticeWords={vocabPracticeWords}
          onVocabFinish={onClose}
          onVocabPlayAgain={onRequestNewRun}
          vocabFinishLabel="Close"
          mode="student"
          storyControlsPlacement="stage-overlay"
          immersiveLayout
        />
      </div>
    </div>
  );
}
