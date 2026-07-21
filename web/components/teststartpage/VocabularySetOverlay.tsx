"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  applyMediaToVocabularySet,
  buildVocabularyPracticeContext,
  buildVocabularySetScreens,
  getVocabularySet,
  practiceWordsInSessionOrder,
  type VocabSetId,
  type VocabularySetDefinition,
} from "@/lib/vocabulary-templates";
import { DEFAULT_PRACTICE_COUNT } from "@/lib/vocabulary-templates/types";
import { playSfx } from "@/lib/audio/sfx";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";
import { loadVocabularySetMedia } from "@/lib/teststartpage/load-vocabulary-set-media-action";
import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import {
  recommendVocabularyPracticeWords,
  vocabularyRecommendationReasonLabel,
  type VocabularyPracticeRecommendation,
} from "@/lib/mastery/recommendations";

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
  initialScreenIndex = 0,
  onClose,
  onRequestNewRun,
  onEconomyChange,
  onActivityComplete,
}: {
  setId: VocabSetId;
  sessionSeed: string;
  muted: boolean;
  /** Resume mid-set when available (from progress lessonResume). */
  initialScreenIndex?: number;
  onClose: () => void;
  onRequestNewRun: () => void;
  onEconomyChange?: () => void;
  /** Fired when the student finishes the activity (reward screen), before close. */
  onActivityComplete?: () => void;
}) {
  const [def, setDef] = useState<VocabularySetDefinition>(() => getVocabularySet(setId));
  const [mediaLoading, setMediaLoading] = useState(true);
  const [adaptiveWordIds, setAdaptiveWordIds] = useState<string[]>([]);
  const [adaptiveRecommendations, setAdaptiveRecommendations] = useState<
    VocabularyPracticeRecommendation[]
  >([]);
  const [showAdaptiveDebug, setShowAdaptiveDebug] = useState(false);
  const exitPracticeSessionRef = useRef<(() => void) | null>(null);

  const lessonId = `vocab-${setId}`;

  const exitOpenPracticeSession = () => {
    exitPracticeSessionRef.current?.();
    exitPracticeSessionRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    const base = getVocabularySet(setId);
    setDef(base);
    setMediaLoading(true);
    void (async () => {
      try {
        const media = await loadVocabularySetMedia(setId);
        if (cancelled) return;
        setDef(applyMediaToVocabularySet(base, media.urlsByWordId, media.coverUrl));
      } catch {
        if (!cancelled) setDef(base);
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setId]);

  useEffect(() => {
    const base = getVocabularySet(setId);
    const mastery = readMasterySnapshot();
    const recommendations = recommendVocabularyPracticeWords({
      words: base.words,
      mastery,
      limit: Math.ceil(DEFAULT_PRACTICE_COUNT / 2),
    });
    setAdaptiveRecommendations(recommendations);
    setAdaptiveWordIds(recommendations.map((rec) => rec.wordId));
  }, [setId, sessionSeed]);

  useEffect(() => {
    setShowAdaptiveDebug(new URLSearchParams(window.location.search).has("adaptiveDebug"));
  }, []);

  const screens = useMemo(
    () =>
      buildVocabularySetScreens(def, {
        seed: sessionSeed,
        practiceCount: DEFAULT_PRACTICE_COUNT,
        preferredWordIds: adaptiveWordIds,
      }),
    [adaptiveWordIds, def, sessionSeed],
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
      preferredWordIds: adaptiveWordIds,
    });
    return practiceWordsInSessionOrder(ctx).map((w) => ({
      id: w.id,
      lemma: w.lemma,
      imageUrl: w.imageUrl,
    }));
  }, [adaptiveWordIds, def, sessionSeed]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (mediaLoading) return;
    void prefetchImageUrls([def.coverImageUrl, ...def.words.map((w) => w.imageUrl)]);
  }, [mediaLoading, def.id, def.coverImageUrl, def.words]);

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
            exitOpenPracticeSession();
            onClose();
          }}
        >
          Close
        </KidButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3">
        {mediaLoading ? (
          <KidPanel className="m-auto text-center">
            <p className="text-lg font-semibold text-kid-ink">Loading pictures…</p>
          </KidPanel>
        ) : (
          <>
            {showAdaptiveDebug ? (
              <AdaptivePracticeDebugPanel
                recommendations={adaptiveRecommendations}
                vocabWordsById={vocabWordsById}
              />
            ) : null}
            <LessonPlayer
              key={`${sessionSeed}:${def.id}:${initialScreenIndex}`}
              lessonId={lessonId}
              lessonTitle={def.title}
              screens={screens}
              runSeed={sessionSeed}
              initialScreenIndex={initialScreenIndex}
              vocabWordsById={vocabWordsById}
              vocabLearnPhraseTheme={def.learnPhraseTheme ?? "default"}
              vocabPracticeWords={vocabPracticeWords}
              onPracticeSessionBind={(api) => {
                exitPracticeSessionRef.current = api.exitIfOpen;
              }}
              onVocabFinish={() => {
                exitPracticeSessionRef.current = null;
                onActivityComplete?.();
                onClose();
              }}
              onVocabPlayAgain={onRequestNewRun}
              onEconomyChange={onEconomyChange}
              vocabFinishLabel="Close"
              mode="student"
              storyControlsPlacement="stage-overlay"
              immersiveLayout
            />
          </>
        )}
      </div>
    </div>
  );
}

function AdaptivePracticeDebugPanel({
  recommendations,
  vocabWordsById,
}: {
  recommendations: VocabularyPracticeRecommendation[];
  vocabWordsById: Record<string, { id: string; lemma: string }>;
}) {
  return (
    <div className="mb-2 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">Adaptive practice selection</p>
        <p className="text-slate-600">{recommendations.length} review slots</p>
      </div>
      {recommendations.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {recommendations.map((rec) => (
            <li
              key={rec.wordId}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
            >
              <span className="font-semibold">
                {vocabWordsById[rec.wordId]?.lemma ?? rec.wordId}
              </span>
              <span className="ml-1 text-slate-600">
                {vocabularyRecommendationReasonLabel(rec.reason)} | {rec.state} |{" "}
                {Math.round(rec.masteryScore * 100)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-slate-600">No mastery-based review words selected.</p>
      )}
    </div>
  );
}
