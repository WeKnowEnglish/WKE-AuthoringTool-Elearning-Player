"use client";

import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KidButton,
  kidLinkSecondaryClassName,
} from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import {
  InteractionFeedbackShell,
  type InteractionFeedbackKind,
} from "@/components/kid-ui/InteractionFeedbackShell";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import { playSfx } from "@/lib/audio/sfx";
import { teardownPlaybackInRoot } from "@/lib/audio/teardown-lesson-playback";
import { speakText, stopSpeaking } from "@/lib/audio/tts";
import type { LessonScreenRow } from "@/lib/lesson/types";
import { getQuizProgressForLessonIndex } from "@/lib/lesson-activity-taxonomy";
import { VOCAB_PLAYER_LESSON_ID_PREFIX } from "@/lib/pilots/compile-vocab-player-run";
import { PlayerCharacter } from "@/components/avatar/PlayerCharacter";
import { PetCompanion } from "@/components/worlds/PetCompanion";
import {
  ensurePetDog,
  getPlayerAppearanceId,
  getProgressSnapshot,
  markLessonComplete,
  setResumeScreen,
} from "@/lib/progress/local-storage";
import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";
import { LevelUpModal } from "@/components/progress/LevelUpModal";
import { grantGardenSeedForQuiz } from "@/lib/garden/quiz-rewards";
import { awardRewards, getPlayerLevel, getRewards } from "@/lib/progress/rewards";
import {
  recordVocabSetCompletionDailyQuestProgress,
  recordVocabSpellDailyQuestProgress,
} from "@/lib/teststartpage/vocab-daily-quests";
import { xpProgressInLevel } from "@/lib/progress/leveling";
import { recordWordInteraction } from "@/lib/progress/word-performance";
import {
  essayPayloadSchema,
  fillBlanksPayloadSchema,
  fixTextPayloadSchema,
  mcQuizPayloadSchema,
  shortAnswerPayloadSchema,
  startPayloadSchema,
  storyPayloadFromStartPlayground,
  tapRewardsByItemId,
  trueFalsePayloadSchema,
  type CompletionPlayground,
  type StartPlaygroundTapReward,
} from "@/lib/lesson-schemas";
import { parseScreenPayload, type ScreenPayload } from "@/lib/lesson-schemas-player";
import type { VocabLearnPhraseTheme, VocabWord } from "@/lib/vocabulary-templates";
import {
  buildVocabRunStats,
  computeVocabSetRewards,
  createVocabRunSession,
  extractVocabWordId,
  isVocabGradedInteraction,
  recordVocabPracticeGold,
  recordVocabRunPass,
  recordVocabRunWrong,
  vocabCompletionGoldDelta,
  type VocabPracticeWordMeta,
  type VocabRewardBreakdown,
  type VocabRunStats,
} from "@/lib/vocabulary-templates/vocab-run-session";
import { VocabActivityRewardScreen } from "@/components/lesson/VocabActivityRewardScreen";
import { PostQuizReportView } from "@/components/lesson/interactions/PostQuizReportView";
import type { TrackScreenOutcome } from "@/lib/learning-tracks/report-results";
import { GrammarActivityRewardScreen } from "@/components/grammar/lesson/GrammarActivityRewardScreen";
import { GrammarPosterScreen } from "@/components/grammar/lesson/GrammarPosterScreen";
import type { GrammarDifficulty } from "@/lib/grammar-builder/schema";
import {
  buildGrammarRunStats,
  computeGrammarPosterRewards,
  createGrammarRunSession,
  grammarCompletionEventId,
  recordGrammarQuizResult,
  type GrammarRewardBreakdown,
  type GrammarRunStats,
} from "@/lib/grammar-templates/grammar-run-session";
import { prefetchInteractionChunk } from "@/components/lesson/interactions/loaders";
import { lazyWithDiagnostics } from "@/lib/app-diagnostics/lazy";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";
import {
  interactionImageFitClass,
  LessonChromeProvider,
} from "@/components/lesson/interactions/shared";
import {
  awardPracticeReward,
  completePracticeSession,
  createStudentPracticeSessionId,
  exitPracticeSessionIfOpen,
  recordAttempt,
  startPracticeSession,
  type StudentResponseKind,
} from "@/lib/student-session";
import { recordVocabularyEvidence } from "@/lib/mastery/vocabulary";
import {
  grammarPosterActivityId,
  recordGrammarEvidence,
} from "@/lib/mastery/grammar";
import { getGrammarQuizItemForLessonScreen } from "@/lib/grammar-templates/grammar-quiz-items";
import type { EvidenceMode } from "@/lib/mastery/types";
import {
  StoryBookView,
  type StoryControlsPlacement,
} from "@/components/lesson/StoryBookView";
import type { LessonPlayerVisualEdit } from "@/components/lesson/lesson-player-edit";

export type { LessonPlayerVisualEdit };

const LazyMcQuiz = lazyWithDiagnostics("interaction:McQuizView", () =>
  import("./interactions/McQuizView").then((m) => ({ default: m.McQuizView })),
);
const LazyTrueFalse = lazyWithDiagnostics("interaction:TrueFalseView", () =>
  import("./interactions/TrueFalseView").then((m) => ({ default: m.TrueFalseView })),
);
const LazyShortAnswer = lazyWithDiagnostics("interaction:ShortAnswerView", () =>
  import("./interactions/ShortAnswerView").then((m) => ({ default: m.ShortAnswerView })),
);
const LazyFixText = lazyWithDiagnostics("interaction:FixTextView", () =>
  import("./interactions/FixTextView").then((m) => ({ default: m.FixTextView })),
);
const LazyFillBlanks = lazyWithDiagnostics("interaction:FillBlanksView", () =>
  import("./interactions/FillBlanksView").then((m) => ({ default: m.FillBlanksView })),
);
const LazyEssay = lazyWithDiagnostics("interaction:EssayView", () =>
  import("./interactions/EssayView").then((m) => ({ default: m.EssayView })),
);
const LazyExploreHotspots = lazyWithDiagnostics("interaction:ExploreHotspotsView", () =>
  import("./interactions/ExploreHotspotsView").then((m) => ({
    default: m.ExploreHotspotsView,
  })),
);
const LazyLanguageInFocus = lazyWithDiagnostics("interaction:LanguageInFocusView", () =>
  import("./interactions/LanguageInFocusView").then((m) => ({
    default: m.LanguageInFocusView,
  })),
);
const LazyDragMatch = lazyWithDiagnostics("interaction:DragMatchView", () =>
  import("./interactions/DragMatchView").then((m) => ({ default: m.DragMatchView })),
);
const LazyLineMatch = lazyWithDiagnostics("interaction:LineMatchView", () =>
  import("./interactions/LineMatchView").then((m) => ({ default: m.LineMatchView })),
);
const LazyClickTargets = lazyWithDiagnostics("interaction:ClickTargetsView", () =>
  import("./interactions/ClickTargetsView").then((m) => ({ default: m.ClickTargetsView })),
);
const LazySoundSort = lazyWithDiagnostics("interaction:SoundSortView", () =>
  import("./interactions/SoundSortView").then((m) => ({ default: m.SoundSortView })),
);
const LazyListenAndChoose = lazyWithDiagnostics("interaction:ListenAndChooseView", () =>
  import("./interactions/ListenAndChooseView").then((m) => ({
    default: m.ListenAndChooseView,
  })),
);
const LazyFlashcards = lazyWithDiagnostics("interaction:FlashcardsView", () =>
  import("./interactions/FlashcardsView").then((m) => ({
    default: m.FlashcardsView,
  })),
);
const LazyListenColorWrite = lazyWithDiagnostics("interaction:ListenColorWriteView", () =>
  import("./interactions/ListenColorWriteView").then((m) => ({
    default: m.ListenColorWriteView,
  })),
);
const LazyLetterMixup = lazyWithDiagnostics("interaction:LetterMixupView", () =>
  import("./interactions/LetterMixupView").then((m) => ({ default: m.LetterMixupView })),
);
const LazyWordShapeHunt = lazyWithDiagnostics("interaction:WordShapeHuntView", () =>
  import("./interactions/WordShapeHuntView").then((m) => ({ default: m.WordShapeHuntView })),
);
const LazyTableComplete = lazyWithDiagnostics("interaction:TableCompleteView", () =>
  import("./interactions/TableCompleteView").then((m) => ({ default: m.TableCompleteView })),
);
const LazySortingGame = lazyWithDiagnostics("interaction:SortingGameView", () =>
  import("./interactions/SortingGameView").then((m) => ({ default: m.SortingGameView })),
);
const LazyVoiceQuestion = lazyWithDiagnostics("interaction:VoiceQuestionView", () =>
  import("./interactions/VoiceQuestionView").then((m) => ({ default: m.VoiceQuestionView })),
);
const LazyGuidedDialogue = lazyWithDiagnostics("interaction:GuidedDialogueView", () =>
  import("./interactions/GuidedDialogueView").then((m) => ({ default: m.GuidedDialogueView })),
);
const LazyDragSentence = lazyWithDiagnostics("interaction:DragSentenceView", () =>
  import("./interactions/DragSentenceView").then((m) => ({ default: m.DragSentenceView })),
);
const LazyWordBucketCatch = lazyWithDiagnostics("interaction:WordBucketCatchView", () =>
  import("./interactions/WordBucketCatchView").then((m) => ({ default: m.WordBucketCatchView })),
);
const LazyExploreRun = lazyWithDiagnostics("interaction:ExploreRunView", () =>
  import("./interactions/ExploreRunView").then((m) => ({ default: m.ExploreRunView })),
);

function InteractionChunkFallback() {
  return (
    <KidPanel className="space-y-4 border-2 border-dashed border-kid-ink/30 bg-kid-panel/80">
      <div className="h-8 w-4/5 max-w-lg animate-pulse rounded-lg bg-kid-ink/10" />
      <div className="h-44 w-full animate-pulse rounded-xl bg-kid-ink/5" />
      <p className="text-sm font-semibold text-neutral-500">Loading activity…</p>
    </KidPanel>
  );
}

function InteractionLazyShell({
  children,
  fillStage = false,
}: {
  children: React.ReactNode;
  fillStage?: boolean;
}) {
  const inner = fillStage ? (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  ) : (
    children
  );
  return <Suspense fallback={<InteractionChunkFallback />}>{inner}</Suspense>;
}

function applyPlaygroundTapReward(opts: {
  lessonId: string;
  screenOrCompletionKey: string;
  itemId: string;
  rule: StartPlaygroundTapReward;
  triggerOrdinal: number;
  isPreview: boolean;
}) {
  if (opts.isPreview) return;
  const { lessonId, screenOrCompletionKey, itemId, rule, triggerOrdinal } = opts;
  const goldDelta = Math.max(0, rule.gold ?? 0);
  const experienceDelta = Math.max(0, rule.experience ?? 0);
  if (goldDelta > 0 || experienceDelta > 0) {
    const eventId = `${lessonId}:${screenOrCompletionKey}:${itemId}:playground:${triggerOrdinal}`;
    awardRewards({ goldDelta, experienceDelta, eventId });
  }
}

function RewardScreen({
  lessonTitle,
  onPlayAgain,
  muted,
  lessonId,
  isPreview,
  completionPlayground,
  onEconomyRefresh,
}: {
  lessonTitle: string;
  onPlayAgain: () => void;
  muted: boolean;
  lessonId: string;
  isPreview: boolean;
  completionPlayground?: CompletionPlayground | null;
  onEconomyRefresh: () => void;
}) {
  const playerAppearanceId = getPlayerAppearanceId();

  useEffect(() => {
    ensurePetDog();
  }, []);

  const completionStoryPayload = useMemo(() => {
    if (!completionPlayground) return null;
    try {
      return storyPayloadFromStartPlayground(completionPlayground);
    } catch {
      return null;
    }
  }, [completionPlayground]);

  const completionTapRewards = useMemo(
    () => tapRewardsByItemId(completionPlayground?.tap_rewards),
    [completionPlayground?.tap_rewards],
  );

  const onBookendTapReward = useCallback(
    ({
      itemId,
      rule,
      triggerOrdinal,
    }: {
      itemId: string;
      rule: StartPlaygroundTapReward;
      triggerOrdinal: number;
    }) => {
      applyPlaygroundTapReward({
        lessonId,
        screenOrCompletionKey: "completion",
        itemId,
        rule,
        triggerOrdinal,
        isPreview,
      });
      onEconomyRefresh();
    },
    [lessonId, isPreview, onEconomyRefresh],
  );

  return (
    <div className="relative overflow-hidden rounded-xl">
      <KidConfetti active />
      <KidPanel className="relative text-center">
        {completionStoryPayload ? (
          <div className="mb-6 text-left">
            <StoryBookView
              key="completion-playground"
              screenId={`${lessonId}-completion-playground`}
              payload={completionStoryPayload}
              muted={muted}
              compactPreview={isPreview}
              canvasEdit={false}
              lessonBackDisabled
              embedMode="bookend"
              bookendHideNav
              bookendTapRewardByItemId={completionTapRewards}
              onBookendTapReward={onBookendTapReward}
              onNextScreen={() => {}}
              onBackScreen={() => {}}
            />
          </div>
        ) : null}
        <p className="text-3xl font-extrabold text-kid-ink">Great job!</p>
        <div className="relative mx-auto mt-4 flex max-w-[11rem] justify-center">
          <PlayerCharacter appearanceId={playerAppearanceId} size="lg" />
          <PetCompanion mood="excited" size="sm" />
        </div>
        <p className="mt-3 text-xl text-kid-ink">You finished {lessonTitle}!</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <KidButton
            type="button"
            onClick={() => {
              playSfx("tap", muted);
              onPlayAgain();
            }}
          >
            Play again
          </KidButton>
          <Link href="/learn" className={kidLinkSecondaryClassName}>
            Finish
          </Link>
        </div>
      </KidPanel>
    </div>
  );
}

export type LessonPlayerMode = "student" | "preview";

type Props = {
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
  /** Optional post-lesson interactive layer (same schema as start-screen `playground`). */
  completionPlayground?: CompletionPlayground | null;
  /** Preview: no progress writes, different end screen */
  mode?: LessonPlayerMode;
  /** When set (e.g. teacher preview), open this screen index first */
  initialScreenIndex?: number;
  /** When set, ExploreHotspots preview starts at this scene index (0 = beginning) */
  initialPhaseIndex?: number;
  /** When mode is preview, show inline editors on the student layout */
  visualEdit?: LessonPlayerVisualEdit;
  /** Story screens: inset nav on the stage (vocabulary overlay). */
  storyControlsPlacement?: StoryControlsPlacement;
  /** Full-height flex shell, no page scroll (vocabulary overlay / published play). */
  immersiveLayout?: boolean;
  /**
   * With immersiveLayout: size to content height instead of filling the parent.
   * Use inside FitScale / authoring embeds so activities can scale to fit.
   */
  embedNaturalHeight?: boolean;
  /**
   * When mode is preview: authoring tooling vs published student practice.
   * Affects end-screen copy and finish links (not progress writes).
   */
  previewAudience?: "authoring" | "published";
  /** Published preview finish link (e.g. back to classroom wall). */
  previewFinishHref?: string;
  previewFinishLabel?: string;
  /** Preview only: header Restart starts a fresh run without leaving the player. */
  onPreviewRestart?: () => void;
  /** Per-run shuffle seed (vocabulary learn reveal order). */
  runSeed?: string;
  /** Learn word metadata for sticker-match TTS (vocabulary overlay). */
  vocabWordsById?: Record<string, Pick<VocabWord, "id" | "lemma" | "grammar" | "mealVerb">>;
  vocabLearnPhraseTheme?: VocabLearnPhraseTheme;
  /** Words in this run (for completion stats / review list). */
  vocabPracticeWords?: VocabPracticeWordMeta[];
  /**
   * Reward screen layout. Defaults to report for `vocab-player-*` lesson ids;
   * Primary Product A passes `"report"` while keeping stable `vocab-${setId}` ids.
   */
  vocabRewardLayout?: "default" | "report";
  onVocabFinish?: () => void;
  vocabFinishLabel?: string;
  /** New run seed (remount player); used by vocabulary Play again. */
  onVocabPlayAgain?: () => void;
  /** Hub: refresh gold/XP/quest UI after vocab rewards or quest bumps. */
  onEconomyChange?: () => void;
  /** Grammar poster practice run (lesson id `grammar-{slug}`). */
  grammarDifficulty?: GrammarDifficulty;
  onGrammarFinish?: () => void;
  grammarFinishLabel?: string;
  /**
   * Vocab pilot: parent can call `exitIfOpen` when the student closes mid-run.
   * Emits `session_completed` with `result: "exited"` (no rewards / no lesson complete).
   */
  onPracticeSessionBind?: (api: { exitIfOpen: () => void }) => void;
  /** Fired when the active screen index changes (vocab overlay progress). */
  onScreenIndexChange?: (index: number) => void;
  /**
   * Preview mode only: fired once when the run reaches the end screen
   * (e.g. homework freeze play that records completion outside LessonPlayer).
   */
  onPreviewComplete?: () => void;
};

export function LessonPlayer({
  lessonId,
  lessonTitle,
  screens,
  completionPlayground = null,
  mode = "student",
  initialScreenIndex = 0,
  initialPhaseIndex,
  visualEdit,
  storyControlsPlacement = "below",
  immersiveLayout = false,
  embedNaturalHeight = false,
  previewAudience = "authoring",
  previewFinishHref,
  previewFinishLabel,
  onPreviewRestart,
  runSeed,
  vocabWordsById,
  vocabLearnPhraseTheme,
  vocabPracticeWords,
  vocabRewardLayout,
  onVocabFinish,
  vocabFinishLabel,
  onVocabPlayAgain,
  onEconomyChange,
  grammarDifficulty,
  onGrammarFinish,
  grammarFinishLabel,
  onPracticeSessionBind,
  onScreenIndexChange,
  onPreviewComplete,
}: Props) {
  const [index, setIndex] = useState(() =>
    Math.min(
      Math.max(0, initialScreenIndex),
      Math.max(0, screens.length - 1),
    ),
  );
  const [done, setDone] = useState(false);
  const [interactionPass, setInteractionPass] = useState(false);
  const [dragFilled, setDragFilled] = useState<string[]>([]);
  const [interactionFeedback, setInteractionFeedback] =
    useState<InteractionFeedbackKind>("none");
  const [trackScreenOutcomes, setTrackScreenOutcomes] = useState<
    Record<string, TrackScreenOutcome>
  >({});
  const trackScreenOutcomesRef = useRef(trackScreenOutcomes);
  trackScreenOutcomesRef.current = trackScreenOutcomes;
  const [gold, setGold] = useState(0);
  const [experience, setExperience] = useState(0);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceCompletedForScreenRef = useRef<string | null>(null);
  /** Screen id that received the current `interactionPass` (blocks stale pass on the next screen). */
  const interactionPassedScreenIdRef = useRef<string | null>(null);
  const playbackRootRef = useRef<HTMLDivElement | null>(null);
  const vocabSessionRef = useRef(createVocabRunSession());
  const grammarSessionRef = useRef(createGrammarRunSession());
  const studentPracticeSessionIdRef = useRef<string | null>(null);
  const studentPracticeSessionStartedRef = useRef(false);
  const studentPracticeSessionCompletedRef = useRef(false);
  const screenHadWrongRef = useRef(false);
  const [vocabComplete, setVocabComplete] = useState<{
    stats: VocabRunStats;
    breakdown: VocabRewardBreakdown;
  } | null>(null);
  const [grammarComplete, setGrammarComplete] = useState<{
    stats: GrammarRunStats;
    breakdown: GrammarRewardBreakdown;
  } | null>(null);

  const { muted: storedMuted } = useAudioMuted();
  const isPreview = mode === "preview";
  /** Teacher Activity Builder preview should always hear TTS / clips. */
  const muted = isPreview ? false : storedMuted;
  const isVocabLesson =
    lessonId.startsWith("vocab-") && (vocabPracticeWords?.length ?? 0) > 0;
  const isVocabPlayerLesson = lessonId.startsWith(`${VOCAB_PLAYER_LESSON_ID_PREFIX}-`);
  const useVocabReportReward =
    vocabRewardLayout === "report" ||
    (vocabRewardLayout !== "default" && isVocabPlayerLesson);
  /** Vocab Player pilot runs in preview chrome but still awards + scores like a live run. */
  const persistVocabProgress = isVocabLesson && (!isPreview || isVocabPlayerLesson);
  const effectiveImmersiveLayout = immersiveLayout || isVocabPlayerLesson;
  const fillInteractionStage = effectiveImmersiveLayout && !embedNaturalHeight;
  const isGrammarLesson = lessonId.startsWith("grammar-");
  const grammarSlug = isGrammarLesson ? lessonId.slice("grammar-".length) : null;
  const canvasEdit = isPreview && visualEdit != null;
  const screen = screens[index];
  const parsed: ScreenPayload | null = screen
    ? parseScreenPayload(screen.screen_type, screen.payload)
    : null;

  const getStudentPracticeSessionId = useCallback(() => {
    if (!studentPracticeSessionIdRef.current) {
      studentPracticeSessionIdRef.current = createStudentPracticeSessionId({
        activityId: lessonId,
        seed: runSeed,
      });
    }
    return studentPracticeSessionIdRef.current;
  }, [lessonId, runSeed]);

  const exitPracticeSessionFromParent = useCallback(() => {
    if (isPreview || studentPracticeSessionCompletedRef.current) return;
    if (!isVocabLesson && !isGrammarLesson) return;
    const sessionId = studentPracticeSessionIdRef.current;
    if (!sessionId || !studentPracticeSessionStartedRef.current) return;
    exitPracticeSessionIfOpen({ sessionId });
    studentPracticeSessionCompletedRef.current = true;
  }, [isPreview, isVocabLesson, isGrammarLesson]);

  useEffect(() => {
    if (!isVocabLesson && !isGrammarLesson || isPreview) return;
    onPracticeSessionBind?.({ exitIfOpen: exitPracticeSessionFromParent });
  }, [exitPracticeSessionFromParent, isPreview, isVocabLesson, isGrammarLesson, onPracticeSessionBind]);

  useEffect(() => {
    onScreenIndexChange?.(index);
  }, [index, onScreenIndexChange]);

  const lessonStartedRef = useRef(false);
  useEffect(() => {
    if (!lessonStartedRef.current) {
      lessonStartedRef.current = true;
      recordAppDiagnostic("lesson", "mark", "lesson_start", {
        lessonId,
        screenCount: screens.length,
        mode,
      });
      return;
    }
    recordAppDiagnostic("lesson", "mark", "screen_advance", {
      lessonId,
      index,
      screenId: screen?.id ?? null,
      screenType: screen?.screen_type ?? null,
    });
  }, [index, lessonId, mode, screen?.id, screen?.screen_type, screens.length]);

  const recordCurrentVocabMasteryEvidence = useCallback(
    (input: { success: boolean; firstTry: boolean; attempts: number }) => {
      if (!isVocabLesson || !isVocabGradedInteraction(parsed)) return;
      const wordId = extractVocabWordId(parsed);
      if (!wordId) return;
      const lemma =
        vocabWordsById?.[wordId]?.lemma ??
        vocabPracticeWords?.find((word) => word.id === wordId)?.lemma ??
        wordId;
      recordVocabularyEvidence({
        studentId: resolveStudentStorageIdSync(),
        sessionId: getStudentPracticeSessionId(),
        activityId: lessonId,
        itemId: screen.id,
        wordId,
        lemma,
        success: input.success,
        firstTry: input.firstTry,
        attempts: input.attempts,
        responseKind: vocabResponseKind(parsed),
        evidenceMode: vocabEvidenceMode(parsed),
        scaffoldingLevel: "medium",
      });
    },
    [
      getStudentPracticeSessionId,
      isVocabLesson,
      lessonId,
      parsed,
      screen?.id,
      vocabPracticeWords,
      vocabWordsById,
    ],
  );

  const recordCurrentGrammarMasteryEvidence = useCallback(
    (input: { success: boolean; firstTry: boolean; attempts: number }) => {
      if (!isGrammarLesson || !grammarSlug || !screen) return;
      if (parsed?.type !== "interaction" || parsed.subtype !== "true_false") return;

      const quizItem = getGrammarQuizItemForLessonScreen({
        lessonId,
        screenId: screen.id,
      });
      if (!quizItem) return;

      recordGrammarEvidence({
        studentId: resolveStudentStorageIdSync(),
        sessionId: getStudentPracticeSessionId(),
        activityId: grammarPosterActivityId(grammarSlug),
        itemId: quizItem.id,
        microSkillId: quizItem.microSkillId,
        label: quizItem.microSkillLabel,
        success: input.success,
        firstTry: input.firstTry,
        attempts: input.attempts,
        errorCode: input.success ? undefined : quizItem.errorCodeOnMiss,
      });
      recordGrammarQuizResult(grammarSessionRef.current, input.success);
    },
    [
      getStudentPracticeSessionId,
      grammarSlug,
      isGrammarLesson,
      lessonId,
      parsed,
      screen,
    ],
  );

  useEffect(() => {
    if (isPreview && !isVocabPlayerLesson) return;
    queueMicrotask(() => {
      const rewards = getRewards();
      setGold(rewards.gold);
      setExperience(rewards.experience);
    });
  }, [isPreview, isVocabPlayerLesson]);

  useEffect(() => {
    const max = Math.max(0, screens.length - 1);
    const next = Math.min(Math.max(0, initialScreenIndex), max);
    queueMicrotask(() => {
      setIndex(next);
    });
  }, [initialScreenIndex, screens.length]);

  useEffect(() => {
    studentPracticeSessionIdRef.current = null;
    studentPracticeSessionStartedRef.current = false;
    studentPracticeSessionCompletedRef.current = false;
  }, [lessonId, runSeed]);

  useEffect(() => {
    if ((!persistVocabProgress && isPreview) || studentPracticeSessionStartedRef.current) return;

    if (isVocabLesson) {
      const event = startPracticeSession({
        activityId: lessonId,
        activityKind: "vocabulary_set",
        source: "student_hub",
        seed: runSeed,
        languageTargets: vocabPracticeWords?.map((word) => word.lemma),
        durationEstimateSec: 8 * 60,
        scaffoldingLevel: "medium",
      });
      studentPracticeSessionIdRef.current = event.sessionId;
      studentPracticeSessionStartedRef.current = true;
      studentPracticeSessionCompletedRef.current = false;
      return;
    }

    if (isPreview) return;

    if (isGrammarLesson && grammarSlug) {
      const event = startPracticeSession({
        activityId: grammarSlug,
        activityKind: "grammar_poster",
        source: "student_hub",
        seed: runSeed,
        durationEstimateSec: 5 * 60,
        scaffoldingLevel: "low",
      });
      studentPracticeSessionIdRef.current = event.sessionId;
      studentPracticeSessionStartedRef.current = true;
      studentPracticeSessionCompletedRef.current = false;
    }
  }, [
    grammarSlug,
    isGrammarLesson,
    isPreview,
    isVocabLesson,
    lessonId,
    persistVocabProgress,
    runSeed,
    vocabPracticeWords,
  ]);

  const quizProgress = useMemo(
    () => getQuizProgressForLessonIndex(screens, index),
    [screens, index],
  );

  useEffect(() => {
    const candidateIndices = [index + 1, index + 2, index - 1].filter(
      (i) => i >= 0 && i < screens.length,
    );
    const seenSubtypes = new Set<string>();
    const maxPrefetch = 4;
    for (const i of candidateIndices) {
      if (seenSubtypes.size >= maxPrefetch) break;
      const row = screens[i];
      const parsedRow = parseScreenPayload(row.screen_type, row.payload);
      if (parsedRow?.type !== "interaction") continue;
      if (seenSubtypes.has(parsedRow.subtype)) continue;
      seenSubtypes.add(parsedRow.subtype);
      prefetchInteractionChunk(parsedRow.subtype);
    }
  }, [index, screens]);

  useEffect(() => {
    if (!lessonId.startsWith("vocab-")) return;
    const urls: string[] = [];
    for (let i = index + 1; i < screens.length && urls.length < 3; i++) {
      const row = screens[i];
      const ahead = parseScreenPayload(row.screen_type, row.payload);
      if (
        ahead?.type === "interaction" &&
        ahead.subtype === "true_false" &&
        ahead.image_url?.trim()
      ) {
        urls.push(ahead.image_url.trim());
      }
    }
    if (urls.length > 0) void prefetchImageUrls(urls);
  }, [index, lessonId, screens]);

  const clearInteractionTransientState = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    autoAdvanceCompletedForScreenRef.current = null;
    setDragFilled([]);
    setInteractionFeedback("none");
  }, []);

  const resetRunScreenOutcomes = useCallback(() => {
    setTrackScreenOutcomes({});
    clearInteractionTransientState();
    interactionPassedScreenIdRef.current = null;
    setInteractionPass(false);
  }, [clearInteractionTransientState]);

  /**
   * Clear timers/feedback before paint; restore pass when revisiting a screen
   * completed earlier in this run (no auto-advance on restore).
   */
  useLayoutEffect(() => {
    clearInteractionTransientState();
    const screenId = screen?.id;
    if (!screenId) {
      interactionPassedScreenIdRef.current = null;
      setInteractionPass(false);
      return;
    }
    const alreadyPassed = trackScreenOutcomesRef.current[screenId]?.passed === true;
    interactionPassedScreenIdRef.current = null;
    setInteractionPass(alreadyPassed);
  }, [screen?.id, index, clearInteractionTransientState]);

  useEffect(() => {
    stopSpeaking();
    if (!isPreview) {
      setResumeScreen(lessonId, index);
    }
  }, [index, lessonId, isPreview]);

  useEffect(() => {
    screenHadWrongRef.current = false;
  }, [screen?.id, index]);

  useEffect(
    () => () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      teardownPlaybackInRoot(playbackRootRef.current);
    },
    [],
  );

  const refreshEconomy = useCallback(() => {
    if (isPreview && !isVocabPlayerLesson) return;
    const rewards = getRewards();
    setGold(rewards.gold);
    setExperience(rewards.experience);
  }, [isPreview, isVocabPlayerLesson]);

  const resetVocabRun = useCallback(() => {
    vocabSessionRef.current = createVocabRunSession();
    screenHadWrongRef.current = false;
    setVocabComplete(null);
  }, []);

  const completeGrammarLesson = useCallback(() => {
    if (!grammarSlug) return;
    const stats = buildGrammarRunStats(
      grammarSessionRef.current,
      grammarSlug,
      grammarDifficulty,
    );
    const breakdown = computeGrammarPosterRewards(stats);
    const completionRewardEventId = grammarCompletionEventId(lessonId, runSeed ?? lessonId);

    if (!isPreview) {
      playSfx("complete", muted);
      const sessionId = getStudentPracticeSessionId();
      const { snapshot } = awardPracticeReward({
        sessionId,
        eventId: completionRewardEventId,
        goldDelta: breakdown.totalGold,
        experienceDelta: breakdown.experienceDelta,
      });
      completePracticeSession({
        sessionId,
        lessonId,
        result: "completed",
        summary: {
          practiceItemCount: 1 + stats.quizGradedCount,
          firstTryGraded: stats.quizGradedCount,
          firstTryCorrect: stats.quizCorrectCount,
          firstTryAccuracyPercent:
            stats.quizGradedCount > 0 ?
              Math.round((stats.quizCorrectCount / stats.quizGradedCount) * 100)
            : 100,
          masteredCount: 1,
          reviewItemIds: [],
          elapsedMs: stats.elapsedMs,
          goldAwarded: breakdown.totalGold,
          experienceAwarded: breakdown.experienceDelta,
        },
      });
      studentPracticeSessionCompletedRef.current = true;
      setGold(snapshot.gold);
      setExperience(snapshot.experience);
      onEconomyChange?.();
    }
    setGrammarComplete({ stats, breakdown });
  }, [
    grammarDifficulty,
    grammarSlug,
    getStudentPracticeSessionId,
    isPreview,
    lessonId,
    muted,
    onEconomyChange,
    runSeed,
  ]);

  const completeVocabLesson = useCallback(() => {
    const practiceCount = vocabPracticeWords?.length ?? 0;
    const stats = buildVocabRunStats(vocabSessionRef.current, practiceCount);
    const breakdown = computeVocabSetRewards(stats);
    const completionGold = vocabCompletionGoldDelta(breakdown, stats.practiceGold);
    const completionSeed = runSeed?.trim() || lessonId;
    const completionRewardEventId = `${lessonId}:${completionSeed}:complete`;
    if (persistVocabProgress) {
      playSfx("complete", muted);
      const sessionId = getStudentPracticeSessionId();
      const { snapshot } = awardPracticeReward({
        sessionId,
        eventId: completionRewardEventId,
        goldDelta: completionGold,
        experienceDelta: breakdown.experienceDelta,
      });
      grantGardenSeedForQuiz(completionRewardEventId, { tier: "bonus" });
      completePracticeSession({
        sessionId,
        lessonId,
        result: "completed",
        summary: {
          practiceItemCount: stats.practiceWordCount,
          firstTryGraded: stats.firstTryGraded,
          firstTryCorrect: stats.firstTryCorrect,
          firstTryAccuracyPercent: stats.firstTryAccuracyPercent,
          masteredCount: stats.wordsMastered,
          reviewItemIds: stats.reviewWordIds,
          elapsedMs: stats.elapsedMs,
          goldAwarded: stats.practiceGold + completionGold,
          experienceAwarded: breakdown.experienceDelta,
        },
      });
      studentPracticeSessionCompletedRef.current = true;
      setGold(snapshot.gold);
      setExperience(snapshot.experience);
      recordVocabSetCompletionDailyQuestProgress();
      onEconomyChange?.();
    }
    setVocabComplete({ stats, breakdown });
  }, [
    getStudentPracticeSessionId,
    lessonId,
    muted,
    onEconomyChange,
    persistVocabProgress,
    runSeed,
    vocabPracticeWords?.length,
  ]);

  const goNext = useCallback(() => {
    if (index < screens.length - 1) {
      const next = index + 1;
      setIndex(next);
      visualEdit?.onScreenIndexChange?.(next);
    } else {
      if (isVocabLesson) {
        completeVocabLesson();
      } else if (isGrammarLesson) {
        completeGrammarLesson();
      } else if (!isPreview) {
        markLessonComplete(lessonId);
        playSfx("complete", muted);
        const snapshot = awardRewards({
          eventId: `${lessonId}:${Date.now()}`,
          goldDelta: 0,
          experienceDelta: 10,
        });
        setGold(snapshot.gold);
        setExperience(snapshot.experience);
      }
      setDone(true);
      recordAppDiagnostic("lesson", "mark", "lesson_complete", {
        lessonId,
        screenCount: screens.length,
        mode,
      });
      if (isPreview) {
        onPreviewComplete?.();
      }
    }
  }, [
    index,
    screens.length,
    lessonId,
    muted,
    isPreview,
    visualEdit,
    isVocabLesson,
    isGrammarLesson,
    completeVocabLesson,
    completeGrammarLesson,
    onPreviewComplete,
    mode,
  ]);

  const goBack = useCallback(() => {
    if (index > 0) {
      const next = index - 1;
      setIndex(next);
      visualEdit?.onScreenIndexChange?.(next);
    }
  }, [index, visualEdit]);

  useEffect(() => {
    if (!interactionPass) {
      autoAdvanceCompletedForScreenRef.current = null;
    }
  }, [interactionPass]);

  useEffect(() => {
    if (!parsed) return;
    if (!screen) return;
    if (!interactionPass) return;
    if (parsed.type !== "interaction" && parsed.type !== "story") return;
    if (!screenAutoAdvancesOnPass(parsed)) return;
    const currentScreenId = screen.id;
    // Pass state must match this screen (avoids scheduling advance on the next screen).
    if (interactionPassedScreenIdRef.current !== currentScreenId) return;
    if (
      autoAdvanceCompletedForScreenRef.current &&
      autoAdvanceCompletedForScreenRef.current !== currentScreenId
    ) {
      return;
    }
    if (autoAdvanceCompletedForScreenRef.current === currentScreenId) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    const advanceMs = autoAdvanceDelayMs(lessonId, parsed);
    autoAdvanceTimerRef.current = setTimeout(() => {
      // Guard against stale timer advancing a newer screen.
      if (screens[index]?.id !== currentScreenId) return;
      autoAdvanceCompletedForScreenRef.current = currentScreenId;
      goNext();
    }, advanceMs);
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [interactionPass, parsed, goNext, lessonId, screen, screens, index]);

  if (screens.length === 0 || !screen) {
    return (
      <KidPanel>
        <p className="text-lg">This lesson has no screens yet.</p>
        {!isPreview ? (
          <Link href="/learn" className="mt-4 inline-block font-semibold underline">
            Back to lessons
          </Link>
        ) : null}
      </KidPanel>
    );
  }

  if (!parsed) {
    return (
      <div className="space-y-6">
        {isPreview ? (
          <p className="rounded border-2 border-amber-600 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
            Preview — this screen’s data is invalid or uses an unsupported type.
          </p>
        ) : null}
        <KidPanel>
          <p className="text-lg font-semibold">This activity could not be loaded.</p>
          <p className="mt-2 text-sm text-neutral-600">
            Type: {screen.screen_type} · Check the lesson content in the teacher editor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {index > 0 ? (
              <KidButton type="button" variant="secondary" onClick={goBack}>
                Back
              </KidButton>
            ) : null}
            <KidButton type="button" onClick={goNext}>
              Skip
            </KidButton>
          </div>
        </KidPanel>
      </div>
    );
  }

  if (done) {
    if (isVocabLesson && vocabComplete && vocabPracticeWords) {
      return (
        <div className={clsx(effectiveImmersiveLayout && "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          <VocabActivityRewardScreen
            lessonTitle={lessonTitle}
            stats={vocabComplete.stats}
            breakdown={vocabComplete.breakdown}
            practiceWords={vocabPracticeWords}
            muted={muted}
            layout={useVocabReportReward ? "report" : "default"}
            onPlayAgain={() => {
              if (onVocabPlayAgain) {
                onVocabPlayAgain();
                return;
              }
              resetVocabRun();
              resetRunScreenOutcomes();
              setDone(false);
              setIndex(0);
              visualEdit?.onScreenIndexChange?.(0);
            }}
            onFinish={onVocabFinish}
            finishHref={!onVocabFinish ? previewFinishHref : undefined}
            finishLabel={
              vocabFinishLabel ??
              (useVocabReportReward
                ? previewFinishLabel ?? "Try another activity"
                : undefined)
            }
            playAgainLabel={useVocabReportReward ? "Replay this set" : undefined}
          />
        </div>
      );
    }
    if (isPreview) {
      const restartPreview = () => {
        playSfx("tap", muted);
        resetRunScreenOutcomes();
        setDone(false);
        setIndex(0);
        visualEdit?.onScreenIndexChange?.(0);
      };

      if (previewAudience === "published") {
        return (
          <div
            className={clsx(
              effectiveImmersiveLayout && "flex min-h-0 flex-1 flex-col items-center justify-center",
            )}
          >
            <KidPanel className="space-y-4 text-center">
              <p className="text-2xl font-bold text-kid-ink">Nice work!</p>
              <p className="mt-2 text-lg text-kid-ink">
                You finished <span className="font-semibold">{lessonTitle}</span>.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <KidButton type="button" onClick={restartPreview}>
                  Play again
                </KidButton>
                {previewFinishHref ? (
                  <Link href={previewFinishHref} className={kidLinkSecondaryClassName}>
                    {previewFinishLabel ?? "Back to classroom"}
                  </Link>
                ) : null}
              </div>
            </KidPanel>
          </div>
        );
      }

      if (lessonId.startsWith("activity-")) {
        return (
          <KidPanel className="space-y-4 text-center">
            <p className="text-2xl font-bold text-kid-ink">Congratulations!</p>
            <p className="mt-2 text-lg text-kid-ink">
              You completed <span className="font-semibold">{lessonTitle}</span>.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <KidButton type="button" onClick={restartPreview}>
                Play again
              </KidButton>
              <Link href="/teacher" className={kidLinkSecondaryClassName}>
                Back to dashboard
              </Link>
              <Link href="/teacher/classes" className={kidLinkSecondaryClassName}>
                Classes
              </Link>
            </div>
          </KidPanel>
        );
      }
      return (
        <KidPanel className="space-y-4 text-center">
          <p className="text-2xl font-bold text-kid-ink">End of preview</p>
          <p className="mt-2 text-lg text-kid-ink">
            This is how students finish {lessonTitle}.
          </p>
          <div>
            <KidButton type="button" onClick={restartPreview}>
              Restart preview
            </KidButton>
          </div>
        </KidPanel>
      );
    }
    if (isGrammarLesson && grammarComplete) {
      return (
        <div className={clsx(effectiveImmersiveLayout && "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          <GrammarActivityRewardScreen
            lessonTitle={lessonTitle}
            stats={grammarComplete.stats}
            breakdown={grammarComplete.breakdown}
            muted={muted}
            finishLabel={grammarFinishLabel}
            onFinish={onGrammarFinish}
          />
        </div>
      );
    }
    return (
      <RewardScreen
        lessonTitle={lessonTitle}
        muted={muted}
        lessonId={lessonId}
        isPreview={isPreview}
        completionPlayground={completionPlayground}
        onEconomyRefresh={refreshEconomy}
        onPlayAgain={() => {
          resetRunScreenOutcomes();
          setDone(false);
          setIndex(0);
          visualEdit?.onScreenIndexChange?.(0);
        }}
      />
    );
  }

  const nav = {
    muted,
    passed: interactionPass,
    onNext: goNext,
    onBack: goBack,
    showBack: index > 0,
    ...(effectiveImmersiveLayout ? { controlsPlacement: "stage-footer" as const } : {}),
  };

  const passHandlers = {
    onPass: () => {
      if (trackScreenOutcomesRef.current[screen.id]?.passed) return;
      interactionPassedScreenIdRef.current = screen.id;
      setTrackScreenOutcomes((current) => ({
        ...current,
        [screen.id]: {
          passed: true,
          wrongAttempts: current[screen.id]?.wrongAttempts ?? 0,
        },
      }));
      setInteractionFeedback("correct");
      window.setTimeout(() => setInteractionFeedback("none"), 750);
      setInteractionPass(true);
      playSfx("correct", muted);
      if (persistVocabProgress || !isPreview) {
        const perQuestionGold =
          (parsed.type === "interaction" || parsed.type === "story") &&
          typeof parsed.gold_reward_on_pass === "number" &&
          Number.isFinite(parsed.gold_reward_on_pass) ?
            Math.max(0, parsed.gold_reward_on_pass)
          : 1;
        const rewardEventId = `${lessonId}:${screen.id}:pass`;
        const responseKind = isVocabLesson ? vocabResponseKind(parsed) : "other";
        let rewardSnapshot = getRewards();
        if (isVocabLesson) {
          const sessionId = getStudentPracticeSessionId();
          recordAttempt({
            sessionId,
            targetId: extractVocabWordId(parsed) ?? screen.id,
            success: true,
            responseKind,
          });
          const awarded = awardPracticeReward({
            sessionId,
            eventId: rewardEventId,
            goldDelta: perQuestionGold,
            experienceDelta: 2,
          });
          rewardSnapshot = awarded.snapshot;
        } else if (!isPreview) {
          rewardSnapshot = awardRewards({
            eventId: rewardEventId,
            goldDelta: perQuestionGold,
            experienceDelta: 2,
          });
        }
        if (persistVocabProgress || !isPreview) {
          grantGardenSeedForQuiz(rewardEventId);
          setGold(rewardSnapshot.gold);
          setExperience(rewardSnapshot.experience);
        }
        if (isVocabLesson && isVocabGradedInteraction(parsed)) {
          const firstTry = !screenHadWrongRef.current;
          recordCurrentVocabMasteryEvidence({
            success: true,
            firstTry,
            attempts: firstTry ? 1 : 2,
          });
          recordVocabRunPass(vocabSessionRef.current, screenHadWrongRef.current);
          recordVocabPracticeGold(vocabSessionRef.current, perQuestionGold);
        }
        if (
          !isPreview &&
          isGrammarLesson &&
          parsed?.type === "interaction" &&
          parsed.subtype === "true_false"
        ) {
          const firstTry = !screenHadWrongRef.current;
          recordCurrentGrammarMasteryEvidence({
            success: true,
            firstTry,
            attempts: firstTry ? 1 : 2,
          });
        }
        if (
          isVocabLesson &&
          parsed.type === "interaction" &&
          parsed.subtype === "letter_mixup"
        ) {
          recordVocabSpellDailyQuestProgress();
          onEconomyChange?.();
        }
        const trackedWords = extractTrackedWords(parsed);
        recordWordInteraction(trackedWords, true);
      } else if (isVocabLesson && isVocabGradedInteraction(parsed)) {
        // Preview without persisted rewards still tracks first-try accuracy for the report.
        recordVocabRunPass(vocabSessionRef.current, screenHadWrongRef.current);
      }
    },
    onWrong: () => {
      setTrackScreenOutcomes((current) => ({
        ...current,
        [screen.id]: {
          passed: current[screen.id]?.passed ?? false,
          wrongAttempts: (current[screen.id]?.wrongAttempts ?? 0) + 1,
        },
      }));
      setInteractionFeedback("wrong");
      window.setTimeout(() => setInteractionFeedback("none"), 520);
      playSfx("wrong", muted);
      if (isVocabLesson && isVocabGradedInteraction(parsed)) {
        if (persistVocabProgress) {
          recordCurrentVocabMasteryEvidence({
            success: false,
            firstTry: false,
            attempts: screenHadWrongRef.current ? 2 : 1,
          });
        }
        if (!screenHadWrongRef.current) {
          recordVocabRunWrong(vocabSessionRef.current, extractVocabWordId(parsed));
        }
        screenHadWrongRef.current = true;
      }
      if (
        !isPreview &&
        isGrammarLesson &&
        parsed?.type === "interaction" &&
        parsed.subtype === "true_false"
      ) {
        recordCurrentGrammarMasteryEvidence({
          success: false,
          firstTry: false,
          attempts: screenHadWrongRef.current ? 2 : 1,
        });
        screenHadWrongRef.current = true;
      }
      if (persistVocabProgress || !isPreview) {
        if (isVocabLesson) {
          recordAttempt({
            sessionId: getStudentPracticeSessionId(),
            targetId: extractVocabWordId(parsed) ?? screen.id,
            success: false,
            responseKind: vocabResponseKind(parsed),
          });
        }
        const trackedWords = extractTrackedWords(parsed);
        recordWordInteraction(trackedWords, false);
      }
    },
  };

  return (
    <LessonChromeProvider
      controlsPlacement={effectiveImmersiveLayout ? "stage-footer" : undefined}
    >
    <div
      ref={playbackRootRef}
      className={clsx(
        "mx-auto w-full max-w-5xl",
        effectiveImmersiveLayout
          ? embedNaturalHeight
            ? "relative flex flex-col gap-2"
            : "relative flex h-full min-h-0 flex-col gap-2 overflow-hidden"
          : "space-y-6",
      )}
    >
      {!isPreview ? <LevelUpModal muted={muted} /> : null}
      {isPreview && !immersiveLayout && previewAudience === "authoring" ? (
        <p className="shrink-0 rounded border-2 border-sky-700 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950">
          Student preview — progress is not saved.
        </p>
      ) : null}
      {!effectiveImmersiveLayout || isVocabPlayerLesson ? (
        <div
          className={clsx(
            "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-4 border-kid-ink",
            isVocabPlayerLesson ? "pb-2" : "gap-3 pb-3",
          )}
        >
          <h1
            className={clsx(
              "font-bold text-kid-ink",
              isVocabPlayerLesson ? "text-lg sm:text-xl" : "text-xl",
            )}
          >
            {lessonTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <p
              className={clsx(
                "rounded-full border border-amber-300 bg-amber-50 font-semibold text-amber-900",
                isVocabPlayerLesson ? "px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm" : "px-3 py-1 text-sm",
              )}
            >
              Gold: {gold}
            </p>
            <p
              className={clsx(
                "rounded-full border border-sky-300 bg-sky-50 font-semibold text-sky-900",
                isVocabPlayerLesson ? "px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm" : "px-3 py-1 text-sm",
              )}
            >
              Lv {xpProgressInLevel(experience).level} · {experience} XP
            </p>
            {isPreview && (onPreviewRestart || previewFinishHref) ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onPreviewRestart ? (
                  <KidButton
                    type="button"
                    variant="secondary"
                    className="!min-h-8 !min-w-0 px-2.5 py-1 text-xs font-bold sm:!min-h-9 sm:px-3 sm:text-sm"
                    onClick={() => {
                      playSfx("tap", muted);
                      onPreviewRestart();
                    }}
                  >
                    Restart
                  </KidButton>
                ) : null}
                {previewFinishHref ? (
                  <Link
                    href={previewFinishHref}
                    className={clsx(
                      kidLinkSecondaryClassName,
                      "!min-h-8 !min-w-0 px-2.5 py-1 text-xs font-bold sm:!min-h-9 sm:px-3 sm:text-sm",
                    )}
                    onClick={() => playSfx("tap", muted)}
                  >
                    {previewFinishLabel ?? "Exit"}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {!effectiveImmersiveLayout && quizProgress && !isVocabPlayerLesson ? (
        <div
          className="rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 shadow-sm"
          role="status"
          aria-live="polite"
          aria-label={`${quizProgress.title ?? "Quiz"}, question ${quizProgress.questionIndex} of ${quizProgress.questionCount}`}
        >
          <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-amber-800/90">
            <span className="uppercase tracking-wide">
              {quizProgress.title ?? "Quiz"}
            </span>
            <span className="tabular-nums">
              {quizProgress.questionIndex}/{quizProgress.questionCount}
            </span>
          </div>
          <p className="mt-0.5 text-center text-sm font-semibold text-amber-950">
            Question {quizProgress.questionIndex} of {quizProgress.questionCount}
          </p>
        </div>
      ) : null}

      <div
        className={clsx(
          effectiveImmersiveLayout &&
            !embedNaturalHeight &&
            "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
      {parsed.type === "start" && (
        <div className="space-y-6">
          {parsed.image_url ? (
            <div
              className={clsx(
                "relative aspect-[16/10] w-full overflow-hidden rounded-lg border-4 border-kid-ink",
                canvasEdit && "ring-2 ring-sky-500 ring-offset-2",
              )}
              title={canvasEdit ? "Edit image URL in the panel →" : undefined}
            >
              <Image
                src={parsed.image_url}
                alt=""
                fill
                className={interactionImageFitClass(parsed.image_fit)}
                sizes="(max-width:768px) 100vw, 42rem"
                priority
                unoptimized={parsed.image_url.includes("placehold.co")}
              />
              {!canvasEdit ? (
                <>
                  <KidButton
                    type="button"
                    variant="secondary"
                    className="absolute right-3 top-3 z-10 !min-h-10 !min-w-0 border-2 border-white/90 bg-white/95 px-3 text-sm shadow-md"
                    onClick={() => {
                      playSfx("tap", muted);
                      speakText(parsed.read_aloud_title ?? lessonTitle, { muted });
                    }}
                  >
                    Hear title
                  </KidButton>
                  <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 pb-5 pt-16 sm:pb-6 sm:pt-20">
                    <KidButton
                      type="button"
                      variant="accent"
                      className="min-w-[12rem] shadow-[6px_6px_0_#0a2f86] sm:min-w-[14rem] sm:text-xl"
                      onClick={() => {
                        playSfx("tap", muted);
                        goNext();
                      }}
                    >
                      {parsed.cta_label ?? "Start learning"}
                    </KidButton>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          {canvasEdit ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex w-full max-w-md flex-col gap-2">
                <label className="text-xs font-semibold text-kid-ink">
                  Title for read-aloud (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border-2 border-kid-ink px-2 py-1 text-base"
                    value={parsed.read_aloud_title ?? ""}
                    onChange={(e) => {
                      try {
                        const next = startPayloadSchema.parse({
                          type: "start",
                          image_url: parsed.image_url,
                          image_fit: parsed.image_fit ?? "contain",
                          cta_label: parsed.cta_label,
                          read_aloud_title: e.target.value || undefined,
                        });
                        visualEdit!.onPayloadChange(screen.id, next);
                      } catch {
                        /* ignore */
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  aria-label="Start button label"
                  className="min-h-14 min-w-[10rem] rounded-lg border-4 border-kid-ink bg-kid-cta px-6 py-3 text-center text-lg font-semibold text-kid-ink shadow-inner outline-none ring-sky-500 focus:ring-4"
                  value={parsed.cta_label ?? "Start learning"}
                  onChange={(e) => {
                    try {
                      const next = startPayloadSchema.parse({
                        type: "start",
                        image_url: parsed.image_url,
                        image_fit: parsed.image_fit ?? "contain",
                        cta_label: e.target.value,
                        read_aloud_title: parsed.read_aloud_title,
                      });
                      visualEdit!.onPayloadChange(screen.id, next);
                    } catch {
                      /* ignore partial */
                    }
                  }}
                />
              </div>
            </div>
          ) : null}
          {!canvasEdit && !parsed.image_url ? (
            <div className="flex flex-col items-center gap-4">
              <KidButton
                type="button"
                variant="accent"
                className="!min-h-12 !min-w-0 px-5"
                onClick={() => {
                  playSfx("tap", muted);
                  speakText(parsed.read_aloud_title ?? lessonTitle, { muted });
                }}
              >
                Hear title
              </KidButton>
              <KidButton
                onClick={() => {
                  playSfx("tap", muted);
                  goNext();
                }}
              >
                {parsed.cta_label ?? "Start learning"}
              </KidButton>
            </div>
          ) : null}
        </div>
      )}

      {parsed.type === "grammar" && (
        <GrammarPosterScreen
          grammarSlug={parsed.grammar_slug}
          muted={muted}
          onComplete={() => {
            playSfx("tap", muted);
            goNext();
          }}
          completeLabel={index === screens.length - 1 ? "Finish" : "Complete"}
        />
      )}

      {parsed.type === "story" &&
        (parsed.pass_rule || parsed.auto_advance_on_pass === true ? (
          <InteractionFeedbackShell kind={interactionFeedback}>
            <StoryBookView
              key={screen.id}
              screenId={screen.id}
              runSeed={runSeed}
              vocabWordsById={vocabWordsById}
              vocabLearnPhraseTheme={vocabLearnPhraseTheme}
              payload={parsed}
              muted={muted}
              compactPreview={isPreview}
              canvasEdit={!!canvasEdit}
              visualEdit={visualEdit}
              lessonBackDisabled={index <= 0}
              interactionScreenPassed={interactionPass}
              onInteractionPass={passHandlers.onPass}
              onInteractionWrong={passHandlers.onWrong}
              controlsPlacement={storyControlsPlacement}
              onNextScreen={() => {
                playSfx("tap", muted);
                goNext();
              }}
              onBackScreen={() => {
                playSfx("tap", muted);
                goBack();
              }}
            />
          </InteractionFeedbackShell>
        ) : (
          <StoryBookView
            key={screen.id}
            screenId={screen.id}
            runSeed={runSeed}
            vocabWordsById={vocabWordsById}
            vocabLearnPhraseTheme={vocabLearnPhraseTheme}
            payload={parsed}
            muted={muted}
            compactPreview={isPreview}
            canvasEdit={!!canvasEdit}
            visualEdit={visualEdit}
            lessonBackDisabled={index <= 0}
            controlsPlacement={storyControlsPlacement}
            onNextScreen={() => {
              playSfx("tap", muted);
              goNext();
            }}
            onBackScreen={() => {
              playSfx("tap", muted);
              goBack();
            }}
          />
        ))}

      {parsed.type === "interaction" && parsed.subtype === "post_quiz_report" && (
        <PostQuizReportView
          parsed={parsed}
          outcomes={trackScreenOutcomes}
          sourceScreenIds={screens
            .slice(parsed.source_screen_start, parsed.source_screen_end)
            .map((sourceScreen) => sourceScreen.id)}
          onNext={goNext}
          onBack={goBack}
          showBack={index > 0}
        />
      )}

      {parsed.type === "interaction" && parsed.subtype === "mc_quiz" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Question</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base font-semibold"
                rows={2}
                value={parsed.question}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      mcQuizPayloadSchema.parse({
                        ...parsed,
                        question: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
            <InteractionLazyShell fillStage={fillInteractionStage}>
              <LazyMcQuiz parsed={parsed} {...nav} {...passHandlers} />
            </InteractionLazyShell>
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "true_false" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Statement</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={3}
                value={parsed.statement}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      trueFalsePayloadSchema.parse({
                        ...parsed,
                        statement: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
            <InteractionLazyShell fillStage={fillInteractionStage}>
              <LazyTrueFalse
                parsed={parsed}
                {...nav}
                {...passHandlers}
                snappyCorrect={lessonId.startsWith("vocab-")}
                correctiveOnWrong={lessonId.startsWith("vocab-")}
                vocabStageTint={lessonId.startsWith("vocab-")}
              />
            </InteractionLazyShell>
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "short_answer" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Prompt</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={2}
                value={parsed.prompt}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      shortAnswerPayloadSchema.parse({
                        ...parsed,
                        prompt: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <InteractionLazyShell>
              <LazyShortAnswer parsed={parsed} {...nav} {...passHandlers} />
            </InteractionLazyShell>
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "fix_text" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Broken text</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={3}
                value={parsed.broken_text}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      fixTextPayloadSchema.parse({
                        ...parsed,
                        broken_text: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <InteractionLazyShell>
              <LazyFixText
                key={`${screen.id}:${parsed.broken_text}`}
                parsed={parsed}
                {...nav}
                {...passHandlers}
              />
            </InteractionLazyShell>
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "fill_blanks" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Template</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 font-mono text-sm"
                rows={2}
                value={parsed.template}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      fillBlanksPayloadSchema.parse({
                        ...parsed,
                        template: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
            <InteractionLazyShell fillStage={fillInteractionStage}>
              <LazyFillBlanks
                key={screen.id}
                parsed={parsed}
                {...nav}
                {...passHandlers}
                vocabStageTint={lessonId.startsWith("vocab-")}
              />
            </InteractionLazyShell>
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "essay" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Prompt</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={3}
                value={parsed.prompt}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      essayPayloadSchema.parse({
                        ...parsed,
                        prompt: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <InteractionLazyShell>
              <LazyEssay
                parsed={parsed}
                muted={muted}
                passed={interactionPass}
                onPass={passHandlers.onPass}
                onNext={goNext}
                onBack={goBack}
                showBack={index > 0}
              />
            </InteractionLazyShell>
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "explore_hotspots" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyExploreHotspots parsed={parsed} {...nav} {...passHandlers} initialPhaseIndex={initialPhaseIndex} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "language_in_focus" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyLanguageInFocus parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "drag_match" && (
        <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
          <InteractionLazyShell fillStage={fillInteractionStage}>
            <LazyDragMatch parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "line_match" && (
        <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
          <InteractionLazyShell fillStage={fillInteractionStage}>
            <LazyLineMatch parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "click_targets" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyClickTargets parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "sound_sort" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazySoundSort parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "listen_and_choose" && (
        <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
          <InteractionLazyShell fillStage={fillInteractionStage}>
            <LazyListenAndChoose key={screen.id} parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "flashcards" && (
        <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
          <InteractionLazyShell fillStage={fillInteractionStage}>
            <LazyFlashcards key={screen.id} parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "listen_color_write" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyListenColorWrite key={screen.id} parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "letter_mixup" && (
        <InteractionFeedbackShell kind={interactionFeedback} fillStage={fillInteractionStage}>
          <InteractionLazyShell fillStage={fillInteractionStage}>
            <LazyLetterMixup
              key={screen.id}
              parsed={parsed}
              {...nav}
              {...passHandlers}
              vocabStageTint={lessonId.startsWith("vocab-")}
            />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "word_shape_hunt" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyWordShapeHunt parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "table_complete" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyTableComplete parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "sorting_game" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazySortingGame parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "voice_question" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyVoiceQuestion
              parsed={parsed}
              lessonId={lessonId}
              screenId={screen.id}
              {...nav}
              {...passHandlers}
            />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "guided_dialogue" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyGuidedDialogue
              parsed={parsed}
              lessonId={lessonId}
              screenId={screen.id}
              {...nav}
              {...passHandlers}
            />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "drag_sentence" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyDragSentence
              parsed={parsed}
              muted={muted}
              filled={dragFilled}
              setFilled={setDragFilled}
              passed={interactionPass}
              {...passHandlers}
              onNext={goNext}
              onBack={goBack}
              showBack={index > 0}
            />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "word_bucket_catch" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <InteractionLazyShell>
            <LazyWordBucketCatch parsed={parsed} {...nav} {...passHandlers} />
          </InteractionLazyShell>
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "explore" && (
        <InteractionLazyShell fillStage>
          <LazyExploreRun
            parsed={parsed}
            muted={muted}
            passed={interactionPass}
            lessonId={lessonId}
            screenId={screen.id}
            isPreview={isPreview}
            onPass={passHandlers.onPass}
            onEconomyChange={onEconomyChange}
          />
        </InteractionLazyShell>
      )}
      </div>
    </div>
    </LessonChromeProvider>
  );
}

function screenAutoAdvancesOnPass(payload: ScreenPayload | null): boolean {
  if (!payload) return false;
  if (
    (payload.type === "story" || payload.type === "interaction") &&
    payload.auto_advance_on_pass === true
  ) {
    return true;
  }
  return payload.type === "interaction" && payload.subtype === "letter_mixup";
}

function autoAdvanceDelayMs(lessonId: string, payload: ScreenPayload | null): number {
  if (lessonId.startsWith("vocab-") || lessonId.startsWith("vocab-player-")) return 120;
  if (payload?.type === "interaction" && payload.subtype === "letter_mixup") return 450;
  return 650;
}

function extractWords(text: string): string[] {
  const matches = text.match(/[A-Za-z']+/g) ?? [];
  return matches.map((w) => w.toLowerCase());
}

function uniqueWords(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, 40);
}

function extractTrackedWords(payload: ScreenPayload): string[] {
  if (payload.type !== "interaction") return [];
  switch (payload.subtype) {
    case "mc_quiz":
      return uniqueWords(
        extractWords(payload.question).concat(payload.options.flatMap((option) => extractWords(option.label))),
      );
    case "true_false":
      return uniqueWords(extractWords(payload.statement));
    case "fill_blanks":
      return uniqueWords(
        extractWords(payload.template).concat((payload.word_bank ?? []).flatMap((word) => extractWords(word))),
      );
    case "fix_text":
      return uniqueWords(
        extractWords(payload.broken_text).concat(payload.acceptable.flatMap((option) => extractWords(option))),
      );
    case "drag_sentence":
      return uniqueWords(payload.word_bank.flatMap((word) => extractWords(word)));
    case "explore_hotspots":
      return uniqueWords(
        extractWords(payload.body_text ?? "").concat(
          payload.dialogues.flatMap((d) =>
            extractWords(d.title).concat(d.turns.flatMap((t) => extractWords(t.text))),
          ),
        ),
      );
    case "language_in_focus":
      return uniqueWords(
        extractWords(payload.body_text ?? "")
          .concat(extractWords(payload.sentence_template))
          .concat(
            payload.slot_banks.flatMap((bank) =>
              bank.options.flatMap((o) =>
                extractWords(o.label).concat(extractWords(o.base_form ?? "")),
              ),
            ),
          ),
      );
    case "word_bucket_catch":
      return uniqueWords(extractWords(payload.target_word));
    case "explore": {
      const words = payload.gates.flatMap((g) =>
        [g.target_word, ...(g.accepted_words ?? [])].flatMap((w) => extractWords(w)),
      );
      return uniqueWords(words);
    }
    case "letter_mixup": {
      const words = payload.items.flatMap((item) =>
        [item.target_word, ...(item.accepted_words ?? [])].flatMap((w) => extractWords(w)),
      );
      return uniqueWords(words);
    }
    default:
      return [];
  }
}

function vocabResponseKind(payload: ScreenPayload | null): StudentResponseKind {
  if (!payload || payload.type !== "interaction") return "other";
  switch (payload.subtype) {
    case "fill_blanks":
    case "letter_mixup":
      return "type";
    case "true_false":
    case "mc_quiz":
    case "listen_and_choose":
      return "tap";
    default:
      return "other";
  }
}

function vocabEvidenceMode(payload: ScreenPayload | null): EvidenceMode {
  if (!payload || payload.type !== "interaction") return "recall";
  switch (payload.subtype) {
    case "true_false":
    case "mc_quiz":
    case "listen_and_choose":
      return "recognition";
    case "letter_mixup":
      return "production";
    case "fill_blanks":
    default:
      return "recall";
  }
}


