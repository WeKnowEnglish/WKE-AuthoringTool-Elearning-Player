"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { PrimaryChrome } from "@/components/primary/PrimaryChrome";
import { HomeworkProgressBar } from "@/components/primary/HomeworkPlayChrome";
import { prefetchInteractionChunk } from "@/components/lesson/interactions/loaders";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import {
  applyMediaToVocabularySet,
  getVocabularySet,
  type VocabSetId,
  type VocabularySetDefinition,
} from "@/lib/vocabulary-templates";
import { playSfx } from "@/lib/audio/sfx";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";
import {
  VOCAB_PHASE_LABELS,
  vocabLessonId,
  vocabPhaseFromResumeIndex,
} from "@/lib/primary/vocab-continue";
import { compileVocabPlayerRun } from "@/lib/pilots/compile-vocab-player-run";
import { VOCAB_PLAYER_SAMPLE_SIZE } from "@/lib/pilots/compile-vocab-player-run-constants";
import { buildPoolFromVocabularySetDefinition } from "@/lib/pilots/vocab-player-pool";
import { loadVocabularySetMedia } from "@/lib/teststartpage/load-vocabulary-set-media-action";
import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import {
  recommendVocabularyPracticeWords,
  vocabularyRecommendationReasonLabel,
  type VocabularyPracticeRecommendation,
} from "@/lib/mastery/recommendations";

/**
 * Product A — vocab set practice (Primary Vocabulary tab).
 * Runtime spine: Vocab Player (flashcards → letter → line match → MC → listen).
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
const LessonPlayer = dynamic(
  () => import("@/components/lesson/LessonPlayer").then((m) => ({ default: m.LessonPlayer })),
  {
    ssr: false,
    loading: () => (
      <div className="m-auto rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-6 py-8 text-center shadow-sm">
        <p className="text-lg font-extrabold text-[var(--pl-ink)]">Loading lesson…</p>
      </div>
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
  const [screenIndex, setScreenIndex] = useState(initialScreenIndex);
  const [compileError, setCompileError] = useState<string | null>(null);
  const warmedSeedRef = useRef<string | null>(null);
  const exitPracticeSessionRef = useRef<(() => void) | null>(null);
  const { muted: storeMuted, toggleMuted } = useAudioMuted();
  const effectiveMuted = muted || storeMuted;

  const lessonId = vocabLessonId(setId);

  const exitOpenPracticeSession = () => {
    exitPracticeSessionRef.current?.();
    exitPracticeSessionRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    const base = getVocabularySet(setId);
    setDef(base);
    setMediaLoading(true);
    setCompileError(null);
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
      limit: Math.ceil(VOCAB_PLAYER_SAMPLE_SIZE / 2),
    });
    setAdaptiveRecommendations(recommendations);
    setAdaptiveWordIds(recommendations.map((rec) => rec.wordId));
  }, [setId, sessionSeed]);

  useEffect(() => {
    setShowAdaptiveDebug(new URLSearchParams(window.location.search).has("adaptiveDebug"));
  }, []);

  const compiledRun = useMemo(() => {
    if (mediaLoading) return null;
    try {
      const run = compileVocabPlayerRun({
        seed: sessionSeed,
        pool: buildPoolFromVocabularySetDefinition(def),
        preferredWordIds: adaptiveWordIds,
        sampleSize: VOCAB_PLAYER_SAMPLE_SIZE,
      });
      return run;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "This topic needs more pictures before you can play.",
      } as const;
    }
  }, [adaptiveWordIds, def, mediaLoading, sessionSeed]);

  const screens = compiledRun && "screens" in compiledRun ? compiledRun.screens : [];
  const vocabPracticeWords =
    compiledRun && "practiceWords" in compiledRun ? compiledRun.practiceWords : [];
  const runError =
    compiledRun && "error" in compiledRun ? compiledRun.error : compileError;

  useEffect(() => {
    if (!compiledRun || !("screens" in compiledRun)) {
      if (compiledRun && "error" in compiledRun) setCompileError(compiledRun.error);
      return;
    }
    setCompileError(null);
  }, [compiledRun]);

  const phaseLabel =
    VOCAB_PHASE_LABELS[vocabPhaseFromResumeIndex(screenIndex, VOCAB_PLAYER_SAMPLE_SIZE)];

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

  useEffect(() => {
    setScreenIndex(initialScreenIndex);
  }, [initialScreenIndex, sessionSeed, setId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (mediaLoading || !compiledRun || !("imageUrls" in compiledRun)) return;
    if (warmedSeedRef.current === sessionSeed) return;
    warmedSeedRef.current = sessionSeed;
    prefetchInteractionChunk("flashcards");
    prefetchInteractionChunk("letter_mixup");
    prefetchInteractionChunk("line_match");
    prefetchInteractionChunk("mc_quiz");
    prefetchInteractionChunk("listen_and_choose");
    void prefetchImageUrls(compiledRun.imageUrls);
  }, [compiledRun, mediaLoading, sessionSeed]);

  return (
    <PrimaryChrome
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[var(--pl-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${def.title} vocabulary set`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--pl-border)] bg-white px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--pl-purple)]">
            Vocabulary practice · {phaseLabel}
          </p>
          <p className="truncate text-sm font-extrabold text-[var(--pl-ink)] sm:text-base">
            {def.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSfx("tap", effectiveMuted);
              toggleMuted();
            }}
            aria-pressed={storeMuted}
            aria-label={storeMuted ? "Sound off" : "Sound on"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
          >
            {storeMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
            onClick={() => {
              playSfx("tap", effectiveMuted);
              exitOpenPracticeSession();
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3 sm:py-3">
        {mediaLoading ? (
          <div className="m-auto rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-6 py-8 text-center shadow-sm">
            <p className="text-lg font-extrabold text-[var(--pl-ink)]">Loading pictures…</p>
          </div>
        ) : runError ? (
          <div className="m-auto max-w-md rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-6 py-8 text-center shadow-sm">
            <p className="text-lg font-extrabold text-[var(--pl-ink)]">Pictures coming soon</p>
            <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">{runError}</p>
            <button
              type="button"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
              onClick={() => {
                playSfx("tap", effectiveMuted);
                onClose();
              }}
            >
              Back to Vocabulary
            </button>
          </div>
        ) : (
          <>
            {screens.length > 0 ? (
              <div className="mb-2 shrink-0">
                <HomeworkProgressBar
                  label={phaseLabel}
                  current={Math.min(screenIndex + 1, screens.length)}
                  total={screens.length}
                />
              </div>
            ) : null}
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
              vocabPracticeWords={vocabPracticeWords}
              vocabRewardLayout="report"
              onPracticeSessionBind={(api) => {
                exitPracticeSessionRef.current = api.exitIfOpen;
              }}
              onScreenIndexChange={setScreenIndex}
              onVocabFinish={() => {
                exitPracticeSessionRef.current = null;
                onActivityComplete?.();
                onClose();
              }}
              onVocabPlayAgain={onRequestNewRun}
              onEconomyChange={onEconomyChange}
              vocabFinishLabel="Back to Vocabulary"
              mode="student"
              storyControlsPlacement="stage-overlay"
              immersiveLayout
            />
          </>
        )}
      </div>
    </PrimaryChrome>
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
    <div className="mb-2 shrink-0 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] px-3 py-2 text-xs text-[var(--pl-ink)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold">Adaptive practice selection</p>
        <p className="text-[var(--pl-muted)]">{recommendations.length} review slots</p>
      </div>
      {recommendations.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {recommendations.map((rec) => (
            <li
              key={rec.wordId}
              className="rounded-xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-2 py-1"
            >
              <span className="font-semibold">
                {vocabWordsById[rec.wordId]?.lemma ?? rec.wordId}
              </span>
              <span className="ml-1 text-[var(--pl-muted)]">
                {vocabularyRecommendationReasonLabel(rec.reason)} | {rec.state} |{" "}
                {Math.round(rec.masteryScore * 100)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[var(--pl-muted)]">No mastery-based review words selected.</p>
      )}
    </div>
  );
}
