"use client";

import NextImage from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import {
  InteractionFeedbackShell,
  type InteractionFeedbackKind,
} from "@/components/kid-ui/InteractionFeedbackShell";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { LevelUpModal } from "@/components/progress/LevelUpModal";
import { PlayerLevelBar } from "@/components/progress/PlayerLevelBar";
import { StickerStorePanel } from "@/components/progress/StickerStorePanel";
import { UnlockSplashButton } from "@/components/progress/UnlockSplashButton";
import { FillBlanksView } from "@/components/lesson/interactions/FillBlanksView";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { ChaseGameOverlay } from "@/components/teststartpage/ChaseGameOverlay";
import { DailyQuestsPanel } from "@/components/teststartpage/DailyQuestsPanel";
import { VocabularySetOverlay } from "@/components/teststartpage/VocabularySetOverlay";
import { WordBucketCatchOverlay } from "@/components/teststartpage/WordBucketCatchOverlay";
import { PuppetPresenterOverlay } from "@/components/teststartpage/PuppetPresenterOverlay";
import { QuizStickerFallback } from "@/components/teststartpage/QuizStickerFallback";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, unlockSpeechSynthesis } from "@/lib/audio/tts";
import { getProgressSnapshot, setAudioMuted } from "@/lib/progress/local-storage";
import {
  applyTestStartQuizCorrectAnswer,
  applyTestStartQuizWrongAnswer,
  getPlayerLevel,
  getRewards,
  QUIZ_ENERGY_MAX,
} from "@/lib/progress/rewards";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";
import { pickQuizStickerVisual } from "@/lib/teststartpage/quiz-question-sticker";
import {
  compileQuizForTopicWithDebug,
  DIFFICULTY_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  TOPICS,
  topicMenuImageSrc,
  type QuizBuildOptions,
  type TestStartQuizQuestion,
  type TestStartTopicId,
} from "@/lib/teststartpage/bank";
import { loadTestStartQuizWithMedia } from "@/lib/teststartpage/load-teststart-quiz-action";
import { loadWordBucketCatchDeck } from "@/lib/teststartpage/load-word-bucket-catch-deck-action";
import type { WordBucketCatchConfig } from "@/lib/lesson/word-bucket-catch";
import {
  getExcludedRowIdentitiesForQuiz,
  recordQuizRowIdentities,
} from "@/lib/teststartpage/quiz-recent-row-exclusions";
import {
  appendQuizQuestionReport,
  clearQuizQuestionReports,
  exportReportsAsJson,
  loadQuizQuestionReports,
  type QuizQuestionReportCategory,
  summarizeQuizQuestionForReport,
} from "@/lib/teststartpage/quiz-question-reports";
import { getTestStartQuizSpeakText } from "@/lib/teststartpage/quiz-question-speak-text";
import { bumpDailyQuestProgress } from "@/lib/teststartpage/daily-quests";
import {
  ANIMALS_VOCAB_SET_MENU,
  VOCAB_TOP_MENU,
  vocabSetCoverImageSrc,
  type VocabSetId,
} from "@/lib/vocabulary-templates";
import type { PuppetScriptId } from "@/lib/puppet-activity/types";

type Phase =
  | "splash"
  | "topics"
  | "bucketTopics"
  | "vocabTopics"
  | "animalsTopics"
  | "quizOptions"
  | "quiz"
  | "done";

type VocabReturnPhase = "vocabTopics" | "animalsTopics";

type PlayerMenuPage = "root" | "sticker-store";

function newQuizSeed(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function TestStartPageClient() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [questions, setQuestions] = useState<TestStartQuizQuestion[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<TestStartTopicId | null>(null);
  const [quizBuildOptions, setQuizBuildOptions] = useState<QuizBuildOptions | null>(null);
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNT_OPTIONS)[number]>(6);
  const [difficultyLevel, setDifficultyLevel] = useState<(typeof DIFFICULTY_OPTIONS)[number]>(2);
  const [quizLoading, setQuizLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [interactionPass, setInteractionPass] = useState(false);
  const [interactionFeedback, setInteractionFeedback] =
    useState<InteractionFeedbackKind>("none");
  const [muted, setMuted] = useState(false);
  const [activeQuizSeed, setActiveQuizSeed] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<QuizQuestionReportCategory>("mistopic");
  const [reportNote, setReportNote] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportLogTick, setReportLogTick] = useState(0);
  /** Browser timer id (`window.setTimeout`); typed as number for DOM typings. */
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const lastQuizSpeakKeyRef = useRef<string>("");
  const [doneReplayLock, setDoneReplayLock] = useState(false);
  const [rewardsUi, setRewardsUi] = useState({
    gold: 0,
    experience: 0,
    level: 1,
    skillPoints: 0,
    energy: 0,
    streak: 0,
  });
  const [dailyQuestUiKey, setDailyQuestUiKey] = useState(0);
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [playerMenuPage, setPlayerMenuPage] = useState<PlayerMenuPage>("root");
  const [chaseGameOpen, setChaseGameOpen] = useState(false);
  const [wordBucketCatchOpen, setWordBucketCatchOpen] = useState(false);
  const [bucketGameConfig, setBucketGameConfig] = useState<WordBucketCatchConfig | null>(null);
  const [bucketCompletionEventId, setBucketCompletionEventId] = useState<string | null>(null);
  const [bucketDeckLoading, setBucketDeckLoading] = useState(false);
  const [bucketDeckError, setBucketDeckError] = useState<string | null>(null);
  const [vocabSetOpen, setVocabSetOpen] = useState(false);
  const [activeVocabSetId, setActiveVocabSetId] = useState<VocabSetId | null>(null);
  const [vocabSessionSeed, setVocabSessionSeed] = useState<string | null>(null);
  const [vocabReturnPhase, setVocabReturnPhase] =
    useState<VocabReturnPhase>("vocabTopics");
  const [puppetOpen, setPuppetOpen] = useState(false);
  const [activePuppetScriptId, setActivePuppetScriptId] =
    useState<PuppetScriptId>("like_likes_food");

  const qaReportCount = useMemo(() => loadQuizQuestionReports().length, [reportLogTick, phase]);

  const refreshRewardsUi = useCallback(() => {
    const r = getRewards();
    setRewardsUi({
      gold: r.gold,
      experience: r.experience,
      level: getPlayerLevel(r),
      skillPoints: r.skillPoints ?? 0,
      energy: r.quizEnergy ?? 0,
      streak: r.quizStreak ?? 0,
    });
    setDailyQuestUiKey((k) => k + 1);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMuted(getProgressSnapshot().audioMuted === true));
  }, []);

  useEffect(() => {
    refreshRewardsUi();
  }, [refreshRewardsUi]);

  useEffect(() => {
    if (!playerMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPlayerMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playerMenuOpen]);

  const openPlayerMenu = useCallback(() => {
    playSfx("tap", muted);
    setPlayerMenuPage("root");
    setPlayerMenuOpen(true);
  }, [muted]);

  const closePlayerMenu = useCallback(() => {
    setPlayerMenuOpen(false);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  }, [muted]);

  const resetInteractionState = useCallback(() => {
    setInteractionPass(false);
    setInteractionFeedback("none");
  }, []);

  const goNext = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    playSfx("tap", muted);
    if (!interactionPass) return;
    if (index >= questions.length - 1) {
      bumpDailyQuestProgress("quiz_completions", 1);
      refreshRewardsUi();
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
    }
    resetInteractionState();
  }, [interactionPass, index, questions.length, muted, resetInteractionState, refreshRewardsUi]);

  const goBack = useCallback(() => {
    playSfx("tap", muted);
    if (index <= 0) return;
    setIndex((i) => i - 1);
    resetInteractionState();
  }, [index, muted, resetInteractionState]);

  const onInteractionPass = useCallback(() => {
    setInteractionFeedback("correct");
    window.setTimeout(() => setInteractionFeedback("none"), 480);
    if (phase === "quiz" && activeQuizSeed && selectedTopicId !== null) {
      const eventId = `teststart:${activeQuizSeed}:${selectedTopicId}:q${index}`;
      applyTestStartQuizCorrectAnswer(eventId);
      const q = questions[index];
      if (q?.type === "interaction" && q.subtype === "letter_mixup") {
        bumpDailyQuestProgress("letter_mixup", 1);
      }
      refreshRewardsUi();
    }
    setInteractionPass(true);
    playSfx("correct", muted);
  }, [phase, activeQuizSeed, selectedTopicId, index, muted, questions, refreshRewardsUi]);

  const onInteractionWrong = useCallback(() => {
    setInteractionFeedback("wrong");
    window.setTimeout(() => setInteractionFeedback("none"), 360);
    if (phase === "quiz") {
      const snap = applyTestStartQuizWrongAnswer();
      setRewardsUi((prev) => ({
        ...prev,
        streak: snap.quizStreak ?? 0,
      }));
    }
    playSfx("wrong", muted);
  }, [phase, muted]);

  const passHandlers = useMemo(
    () => ({ onPass: onInteractionPass, onWrong: onInteractionWrong }),
    [onInteractionPass, onInteractionWrong],
  );

  const current = questions[index] ?? null;

  useEffect(() => {
    if (phase !== "quiz" || !interactionPass) return;
    if (questions.length === 0) return;
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      goNext();
    }, 620);
    return () => {
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [phase, interactionPass, index, questions.length, goNext]);

  useEffect(() => {
    if (phase !== "quiz" || questions.length === 0) return;
    const seen = new Set<string>();
    for (const offset of [1, 2]) {
      const q = questions[index + offset];
      const u = q?.image_url?.trim();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      const img = new window.Image();
      img.src = u;
    }
  }, [phase, questions, index]);

  useEffect(() => {
    if (phase !== "done") return;
    setDoneReplayLock(true);
    const id = window.setTimeout(() => setDoneReplayLock(false), 1000);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "quiz" || quizLoading || !current || !activeQuizSeed) return;
    const text = getTestStartQuizSpeakText(current);
    if (!text) return;
    const key = `${activeQuizSeed}:${index}:${text}`;
    if (lastQuizSpeakKeyRef.current === key) return;
    lastQuizSpeakKeyRef.current = key;
    speakText(text, { muted });
  }, [phase, quizLoading, current, index, muted, activeQuizSeed]);

  useEffect(() => {
    if (phase !== "quiz") lastQuizSpeakKeyRef.current = "";
  }, [phase]);

  const nav = {
    muted,
    passed: interactionPass,
    onNext: goNext,
    onBack: goBack,
    showBack: index > 0,
  };

  const loadQuiz = useCallback(async (id: TestStartTopicId, opts: QuizBuildOptions) => {
    setQuizLoading(true);
    const seed = newQuizSeed();
    setActiveQuizSeed(seed);
    const buildOpts: QuizBuildOptions = {
      ...opts,
      excludeRowIdentities: getExcludedRowIdentitiesForQuiz(id, opts),
    };
    try {
      const { questions: next, debug } = await loadTestStartQuizWithMedia(id, seed, buildOpts);
      setQuestions(next);
      if (debug.pickedRowIdentities?.length) {
        recordQuizRowIdentities(id, opts, debug.pickedRowIdentities);
      }
    } catch {
      const { questions: fallback, debug } = compileQuizForTopicWithDebug(id, seed, buildOpts);
      setQuestions(fallback);
      if (debug.pickedRowIdentities?.length) {
        recordQuizRowIdentities(id, opts, debug.pickedRowIdentities);
      }
    } finally {
      setQuizLoading(false);
    }
  }, []);

  const openVocabularySet = useCallback(
    (id: VocabSetId, returnPhase: VocabReturnPhase = "vocabTopics") => {
      const unlockId = `vocab_set:${id}` as const;
      if (!isUnlockAvailable(unlockId, getPlayerLevel())) {
        playSfx("wrong", muted);
        return;
      }
      playSfx("tap", muted);
      setVocabReturnPhase(returnPhase);
      setActiveVocabSetId(id);
      setVocabSessionSeed(newQuizSeed());
      setVocabSetOpen(true);
    },
    [muted],
  );

  const selectBucketTopic = useCallback(async (id: TestStartTopicId) => {
    playSfx("tap", muted);
    setBucketDeckError(null);
    setBucketDeckLoading(true);
    try {
      const r = await loadWordBucketCatchDeck(id, newQuizSeed());
      if (r.ok) {
        const completionId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ?
            `teststart:bucket-complete:${crypto.randomUUID()}`
          : `teststart:bucket-complete:${Date.now()}`;
        setBucketCompletionEventId(completionId);
        setBucketGameConfig(r.config);
        setWordBucketCatchOpen(true);
        setPhase("splash");
      } else {
        setBucketDeckError(r.error);
      }
    } catch {
      setBucketDeckError("Could not load pictures. Try again.");
    } finally {
      setBucketDeckLoading(false);
    }
  }, [muted]);

  function selectTopic(id: TestStartTopicId) {
    playSfx("tap", muted);
    setSelectedTopicId(id);
    setQuestionCount(6);
    setDifficultyLevel(2);
    setQuizBuildOptions(null);
    setQuestions([]);
    setIndex(0);
    setActiveQuizSeed(null);
    setReportOpen(false);
    setReportStatus(null);
    resetInteractionState();
    setPhase("quizOptions");
  }

  function startQuiz() {
    if (!selectedTopicId) return;
    playSfx("tap", muted);
    const opts: QuizBuildOptions = { questionCount, difficultyLevel };
    setQuizBuildOptions(opts);
    setQuestions([]);
    setIndex(0);
    resetInteractionState();
    setPhase("quiz");
    void loadQuiz(selectedTopicId, opts);
  }

  function goToTopics() {
    playSfx("tap", muted);
    setQuestions([]);
    setSelectedTopicId(null);
    setQuizBuildOptions(null);
    setIndex(0);
    setActiveQuizSeed(null);
    setReportOpen(false);
    setReportStatus(null);
    resetInteractionState();
    setPhase("topics");
  }

  function goBackFromQuizOptions() {
    playSfx("tap", muted);
    setSelectedTopicId(null);
    setPhase("topics");
  }

  const activeQuizTitle =
    selectedTopicId ?
      `${TOPICS.find((t) => t.id === selectedTopicId)?.label ?? selectedTopicId} quiz`
    : "Quiz";

  const optionBtnClass = (active: boolean) =>
    clsx(
      "w-full min-h-[4.25rem] rounded-xl border-4 border-kid-ink px-4 text-xl font-bold tracking-wide transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:min-h-[5rem] sm:px-6 sm:text-2xl",
      active ? "bg-[#0f4ecf] text-white shadow-[4px_4px_0_#0a2f86]" : "bg-kid-panel",
    );

  const quizOptionsActionClass =
    "w-full !min-h-[4.25rem] !rounded-xl !px-10 !py-4 !text-xl !font-bold tracking-wide sm:w-auto sm:!min-h-[5rem] sm:!min-w-[16rem] sm:!text-2xl";

  const splashBtnClass =
    "min-h-[5.5rem] flex-1 rounded-[999px] border-4 px-6 text-center text-2xl font-black tracking-wide shadow-[8px_8px_0_#0a2f86] transition-transform [touch-action:manipulation] active:translate-y-[1px] active:scale-[0.99] sm:min-h-[6.5rem] sm:max-w-md";

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7bf4d] text-kid-ink">
      <LevelUpModal muted={muted} />
      {playerMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] cursor-default bg-black/40 [touch-action:manipulation]"
            aria-label="Close menu"
            onPointerDown={(e) => {
              e.preventDefault();
              closePlayerMenu();
            }}
          />
          <aside
            id="quiz-player-menu"
            className="fixed left-0 top-0 z-[71] flex h-dvh w-full max-w-sm flex-col border-r-4 border-kid-ink bg-[#f7bf4d] shadow-2xl"
            aria-label="Quiz menu"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
              {playerMenuPage === "sticker-store" ? (
                <KidButton
                  type="button"
                  variant="secondary"
                  className="!min-h-9 shrink-0 text-sm"
                  onClick={() => {
                    playSfx("tap", muted);
                    setPlayerMenuPage("root");
                  }}
                >
                  Back
                </KidButton>
              ) : (
                <span className="min-w-0 truncate pl-1 text-sm font-extrabold uppercase tracking-wide text-kid-ink">
                  Menu
                </span>
              )}
              <KidButton
                type="button"
                variant="secondary"
                className="!min-h-9 shrink-0 text-sm"
                onClick={() => {
                  playSfx("tap", muted);
                  closePlayerMenu();
                }}
              >
                Close
              </KidButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {playerMenuPage === "root" ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border-4 border-kid-ink bg-kid-panel p-4 text-left transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.99]"
                    onClick={() => {
                      playSfx("tap", muted);
                      setPlayerMenuPage("sticker-store");
                    }}
                  >
                    <span className="text-3xl" aria-hidden>
                      🎁
                    </span>
                    <span className="text-lg font-bold text-kid-ink">Sticker store</span>
                  </button>
                  <DailyQuestsPanel
                    key={dailyQuestUiKey}
                    muted={muted}
                    onEconomyChange={refreshRewardsUi}
                  />
                </>
              ) : (
                <StickerStorePanel muted={muted} onRewardsChange={refreshRewardsUi} />
              )}
            </div>
          </aside>
        </>
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-9 shrink-0 text-sm"
            aria-expanded={playerMenuOpen}
            aria-controls="quiz-player-menu"
            onClick={openPlayerMenu}
          >
            Menu
          </KidButton>
          <div className="flex items-center gap-2" role="meter" aria-label="Energy" aria-valuemin={0} aria-valuemax={QUIZ_ENERGY_MAX} aria-valuenow={rewardsUi.energy}>
            <span className="whitespace-nowrap text-xs font-extrabold uppercase tracking-wide text-kid-ink/90">
              Energy
            </span>
            <div className="flex gap-1">
              {Array.from({ length: QUIZ_ENERGY_MAX }, (_, i) => (
                <div
                  key={i}
                  className={clsx(
                    "h-3 w-7 rounded border-2 border-kid-ink sm:h-3.5 sm:w-8",
                    i < rewardsUi.energy ? "bg-gradient-to-b from-amber-200 to-amber-400 shadow-sm" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-kid-ink">
            <span className="text-kid-ink/80">Streak</span>
            <span className="rounded-md border-2 border-kid-ink bg-kid-panel px-2 py-0.5 tabular-nums">
              ×{rewardsUi.streak}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-kid-ink">
            <span aria-hidden>🪙</span>
            <span className="text-kid-ink/80">Gold</span>
            <span>{rewardsUi.gold}</span>
          </div>
          <PlayerLevelBar experience={rewardsUi.experience} compact />
        </div>
        <KidButton type="button" variant="secondary" className="!min-h-9 shrink-0 text-sm" onClick={toggleMute}>
          {muted ? "Sound off" : "Sound on"}
        </KidButton>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center px-4 py-4 sm:py-6">
        {phase === "splash" ? (
          <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-2">
            <div className="space-y-2 text-center">
              <p className="text-2xl font-extrabold text-kid-ink sm:text-3xl">Quick start</p>
              <p className="text-base font-semibold text-kid-ink/85 sm:text-lg">
                Start a topic quiz, vocabulary sets, the chase game, word bucket catch, or the grammar puppet.
              </p>
            </div>
            <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
              <UnlockSplashButton
                unlockId="topic_quiz"
                playerLevel={rewardsUi.level}
                label="Start a quiz"
                className={clsx(
                  splashBtnClass,
                  "border-[#0a2f86] bg-[#0f4ecf] text-white hover:bg-[#1658dc] sm:text-4xl",
                )}
                onLockedClick={() => playSfx("wrong", muted)}
                onClick={() => {
                  playSfx("tap", muted);
                  setPhase("topics");
                }}
              />
              <UnlockSplashButton
                unlockId="vocab_sets_menu"
                playerLevel={rewardsUi.level}
                label="Vocabulary sets"
                className={clsx(
                  splashBtnClass,
                  "border-kid-ink bg-lime-300 text-kid-ink hover:bg-lime-200 sm:text-3xl",
                )}
                onLockedClick={() => playSfx("wrong", muted)}
                onClick={() => {
                  playSfx("tap", muted);
                  setPhase("vocabTopics");
                }}
              />
              <UnlockSplashButton
                unlockId="chase_game"
                playerLevel={rewardsUi.level}
                label="Start chase game"
                className={clsx(
                  splashBtnClass,
                  "border-kid-ink bg-kid-panel text-kid-ink hover:bg-kid-surface-muted sm:text-4xl",
                )}
                onLockedClick={() => playSfx("wrong", muted)}
                onClick={() => {
                  playSfx("tap", muted);
                  setChaseGameOpen(true);
                }}
              />
              <UnlockSplashButton
                unlockId="word_bucket_catch"
                playerLevel={rewardsUi.level}
                label="Word bucket catch"
                className={clsx(
                  splashBtnClass,
                  "border-kid-ink bg-amber-300 text-kid-ink hover:bg-amber-200 sm:text-4xl",
                )}
                onLockedClick={() => playSfx("wrong", muted)}
                onClick={() => {
                  playSfx("tap", muted);
                  setBucketDeckError(null);
                  setPhase("bucketTopics");
                }}
              />
              <UnlockSplashButton
                unlockId="grammar_puppet"
                playerLevel={rewardsUi.level}
                label="Grammar puppet"
                className={clsx(
                  splashBtnClass,
                  "border-kid-ink bg-sky-200 text-kid-ink hover:bg-sky-100 sm:col-span-2 sm:text-3xl",
                )}
                onLockedClick={() => playSfx("wrong", muted)}
                onClick={() => {
                  playSfx("tap", muted);
                  if (!muted) unlockSpeechSynthesis();
                  setActivePuppetScriptId("like_likes_food");
                  setPuppetOpen(true);
                }}
              />
            </div>
          </div>
        ) : null}

        {phase === "topics" ? (
          <div className="flex w-full max-w-7xl flex-1 flex-col gap-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={quizLoading}
                  aria-label={`${t.label} topic`}
                  className={clsx(
                    "rounded-2xl border-4 border-kid-ink bg-kid-panel p-2 transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-3 md:p-4",
                    quizLoading && "pointer-events-none opacity-60",
                  )}
                  onClick={() => selectTopic(t.id)}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                    <NextImage
                      src={topicMenuImageSrc(t.id)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-auto flex justify-center pt-4">
              <KidButton type="button" variant="secondary" onClick={() => setPhase("splash")}>
                Back
              </KidButton>
            </div>
          </div>
        ) : null}

        {phase === "bucketTopics" ? (
          <div className="flex w-full max-w-7xl flex-1 flex-col gap-6">
            <div className="space-y-2 text-center">
              <p className="text-2xl font-extrabold text-kid-ink sm:text-3xl">Word bucket catch</p>
              <p className="text-base font-semibold text-kid-ink/85 sm:text-lg">
                Pick a topic — pictures come from the media library for that topic.
              </p>
            </div>
            {bucketDeckError ? (
              <KidPanel className="border-red-700 bg-red-50">
                <p className="text-center text-sm font-semibold text-red-900">{bucketDeckError}</p>
              </KidPanel>
            ) : null}
            {bucketDeckLoading ? (
              <p className="text-center text-lg font-bold text-kid-ink">Loading pictures…</p>
            ) : null}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={bucketDeckLoading}
                  aria-label={`${t.label} topic for bucket game`}
                  className={clsx(
                    "rounded-2xl border-4 border-kid-ink bg-kid-panel p-2 transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-3 md:p-4",
                    bucketDeckLoading && "pointer-events-none opacity-60",
                  )}
                  onClick={() => void selectBucketTopic(t.id)}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                    <NextImage
                      src={topicMenuImageSrc(t.id)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="mt-2 text-center text-sm font-bold text-kid-ink">{t.label}</p>
                </button>
              ))}
            </div>
            <div className="mt-auto flex justify-center pt-4">
              <KidButton
                type="button"
                variant="secondary"
                onClick={() => {
                  playSfx("tap", muted);
                  setBucketDeckError(null);
                  setPhase("splash");
                }}
              >
                Back
              </KidButton>
            </div>
          </div>
        ) : null}

        {phase === "vocabTopics" ? (
          <div className="flex w-full max-w-3xl flex-1 flex-col gap-6">
            <div className="space-y-2 text-center">
              <p className="text-2xl font-extrabold text-kid-ink sm:text-3xl">Vocabulary sets</p>
              <p className="text-base font-semibold text-kid-ink/85 sm:text-lg">
                Hand-crafted lessons — tap a set to start learning.
              </p>
            </div>
            <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-4 sm:max-w-lg">
              {VOCAB_TOP_MENU.map((entry) => {
                if (entry.kind === "hub") {
                  const hubLocked = !isUnlockAvailable("vocab_sets_menu", rewardsUi.level);
                  return (
                    <button
                      key={entry.hubId}
                      type="button"
                      aria-label={
                        hubLocked ?
                          `${entry.label} — unlocks at level ${minLevelForUnlock("vocab_sets_menu")}`
                        : `${entry.label} vocabulary categories`
                      }
                      className={clsx(
                        "rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-4",
                        hubLocked && "cursor-not-allowed opacity-55 grayscale",
                      )}
                      onClick={() => {
                        if (hubLocked) {
                          playSfx("wrong", muted);
                          return;
                        }
                        playSfx("tap", muted);
                        setPhase("animalsTopics");
                      }}
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                        <NextImage
                          src={entry.coverImageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <p className="mt-3 text-center text-lg font-bold text-kid-ink">{entry.label}</p>
                      <p className="mt-1 text-center text-sm font-semibold text-kid-ink/75">
                        Wild, pets, sea, and farm
                      </p>
                    </button>
                  );
                }
                const setUnlockId = `vocab_set:${entry.id}` as const;
                const setLocked = !isUnlockAvailable(setUnlockId, rewardsUi.level);
                return (
                <button
                  key={entry.id}
                  type="button"
                  aria-label={
                    setLocked ?
                      `${entry.label} — unlocks at level ${minLevelForUnlock(setUnlockId)}`
                    : `${entry.label} vocabulary set`
                  }
                  className={clsx(
                    "rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-4",
                    setLocked && "cursor-not-allowed opacity-55 grayscale",
                  )}
                  onClick={() => openVocabularySet(entry.id, "vocabTopics")}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                    <NextImage
                      src={vocabSetCoverImageSrc(entry.id)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 text-center text-lg font-bold text-kid-ink">{entry.label}</p>
                  {setLocked ? (
                    <p className="mt-1 text-center text-sm font-bold text-kid-ink/80">
                      Level {minLevelForUnlock(setUnlockId)} to unlock
                    </p>
                  ) : null}
                </button>
              );
              })}
            </div>
            <div className="mt-auto flex justify-center pt-4">
              <KidButton
                type="button"
                variant="secondary"
                onClick={() => {
                  playSfx("tap", muted);
                  setPhase("splash");
                }}
              >
                Back
              </KidButton>
            </div>
          </div>
        ) : null}

        {phase === "animalsTopics" ? (
          <div className="flex w-full max-w-3xl flex-1 flex-col gap-6">
            <div className="space-y-2 text-center">
              <p className="text-2xl font-extrabold text-kid-ink sm:text-3xl">Animals</p>
              <p className="text-base font-semibold text-kid-ink/85 sm:text-lg">
                Pick a category — wild, pets, sea, or farm.
              </p>
            </div>
            <div className="mx-auto grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
              {ANIMALS_VOCAB_SET_MENU.map((entry) => {
                const setUnlockId = `vocab_set:${entry.id}` as const;
                const setLocked = !isUnlockAvailable(setUnlockId, rewardsUi.level);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-label={
                      setLocked ?
                        `${entry.label} — unlocks at level ${minLevelForUnlock(setUnlockId)}`
                      : `${entry.label} vocabulary set`
                    }
                    className={clsx(
                      "rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-4",
                      setLocked && "cursor-not-allowed opacity-55 grayscale",
                    )}
                    onClick={() => openVocabularySet(entry.id, "animalsTopics")}
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                      <NextImage
                        src={vocabSetCoverImageSrc(entry.id)}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="mt-3 text-center text-lg font-bold text-kid-ink">{entry.label}</p>
                    {setLocked ? (
                      <p className="mt-1 text-center text-sm font-bold text-kid-ink/80">
                        Level {minLevelForUnlock(setUnlockId)} to unlock
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto flex justify-center pt-4">
              <KidButton
                type="button"
                variant="secondary"
                onClick={() => {
                  playSfx("tap", muted);
                  setPhase("vocabTopics");
                }}
              >
                Back
              </KidButton>
            </div>
          </div>
        ) : null}

        {phase === "quizOptions" && selectedTopicId ? (
          <div className="flex w-full max-w-lg flex-1 flex-col items-center gap-8 py-4">
            <div className="w-full space-y-3">
              <div className="relative mx-auto aspect-[16/9] w-full max-w-md overflow-hidden rounded-xl border-4 border-kid-ink bg-white">
                <NextImage
                  src={topicMenuImageSrc(selectedTopicId)}
                  alt={`${
                    TOPICS.find((t) => t.id === selectedTopicId)?.label ?? selectedTopicId
                  } topic cover`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <h1 className="text-center text-2xl font-bold">
                {TOPICS.find((t) => t.id === selectedTopicId)?.label ?? selectedTopicId}
              </h1>
            </div>
            <div className="w-full space-y-3">
              <p className="text-center text-xl font-semibold sm:text-2xl">How many questions?</p>
              <div className="mx-auto grid w-full max-w-xl grid-cols-3 gap-3 sm:gap-4">
                {QUESTION_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={optionBtnClass(questionCount === n)}
                    onClick={() => {
                      playSfx("tap", muted);
                      setQuestionCount(n);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full space-y-3">
              <p className="text-center text-xl font-semibold sm:text-2xl">Difficulty</p>
              <div className="mx-auto grid w-full max-w-xl grid-cols-3 gap-3 sm:gap-4">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={optionBtnClass(difficultyLevel === d)}
                    onClick={() => {
                      playSfx("tap", muted);
                      setDifficultyLevel(d);
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <p className="max-w-md text-center text-sm text-kid-ink/80">
              Level 1 is easier words; level 3 favors harder vocabulary. Questions mix multiple choice, fill in the
              blank, and letter mix-up.
            </p>
            <div className="mt-auto flex w-full flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center sm:justify-center">
              <KidButton
                type="button"
                variant="accent"
                onClick={startQuiz}
                disabled={quizLoading}
                className={quizOptionsActionClass}
              >
                Start quiz
              </KidButton>
              <KidButton
                type="button"
                variant="secondary"
                onClick={goBackFromQuizOptions}
                className={quizOptionsActionClass}
              >
                Back to topics
              </KidButton>
            </div>
          </div>
        ) : null}

        {phase === "quiz" && quizLoading && questions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2">
            <p className="text-center text-2xl font-bold text-kid-ink sm:text-3xl">{activeQuizTitle}</p>
            <p className="text-xl font-bold text-kid-ink">Loading your quiz…</p>
            <p className="text-sm text-kid-ink/80">Finding pictures from the media library.</p>
          </div>
        ) : null}

        {phase === "quiz" && current ? (
          <div className="flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-2 sm:gap-3">
            <h1 className="text-center text-xl font-bold leading-tight text-kid-ink sm:text-2xl md:text-3xl">
              {activeQuizTitle}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <KidButton type="button" variant="secondary" onClick={goToTopics} disabled={quizLoading}>
                Topics
              </KidButton>
              <p className="text-base font-semibold text-kid-ink/90" role="status">
                Question {index + 1} of {questions.length}
              </p>
              <button
                type="button"
                className="text-sm font-semibold text-[#0a2f86] underline decoration-2 underline-offset-2 [touch-action:manipulation] hover:text-[#0f4ecf] disabled:opacity-50"
                disabled={quizLoading}
                onClick={() => {
                  playSfx("tap", muted);
                  setReportCategory("mistopic");
                  setReportNote("");
                  setReportStatus(null);
                  setReportOpen(true);
                }}
              >
                Report question
              </button>
            </div>

            {qaReportCount > 0 ? (
              <p className="text-center text-xs text-kid-ink/70">
                QA log: {qaReportCount} report{qaReportCount === 1 ? "" : "s"} saved on this device
              </p>
            ) : null}

            {reportOpen ? (
              <KidPanel className="space-y-3 border-2 border-dashed border-kid-ink/40 bg-amber-50/90 p-4 text-left">
                <p className="text-sm font-bold text-kid-ink">Flag this question (saved locally in your browser)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={clsx(
                      "rounded-lg border-2 border-kid-ink px-3 py-2 text-sm font-semibold [touch-action:manipulation]",
                      reportCategory === "mistopic" ? "bg-[#0f4ecf] text-white" : "bg-white",
                    )}
                    onClick={() => setReportCategory("mistopic")}
                  >
                    Wrong topic
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      "rounded-lg border-2 border-kid-ink px-3 py-2 text-sm font-semibold [touch-action:manipulation]",
                      reportCategory === "other" ? "bg-[#0f4ecf] text-white" : "bg-white",
                    )}
                    onClick={() => setReportCategory("other")}
                  >
                    Something else
                  </button>
                </div>
                <label className="block text-xs font-semibold text-kid-ink/80">
                  Note (optional)
                  <textarea
                    className="mt-1 w-full rounded-lg border-2 border-kid-ink/30 bg-white px-2 py-2 text-sm text-kid-ink"
                    rows={2}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="e.g. distractors don’t fit, typo, …"
                  />
                </label>
                {reportStatus ? <p className="text-sm font-semibold text-green-800">{reportStatus}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <KidButton
                    type="button"
                    variant="accent"
                    className="!min-h-10 text-sm"
                    onClick={() => {
                      if (!selectedTopicId || !quizBuildOptions) return;
                      appendQuizQuestionReport({
                        category: reportCategory,
                        note: reportNote.trim(),
                        topicId: selectedTopicId,
                        topicLabel: TOPICS.find((t) => t.id === selectedTopicId)?.label ?? selectedTopicId,
                        quizSeed: activeQuizSeed ?? "unknown",
                        questionIndex: index,
                        questionCount: questions.length,
                        difficultyLevel: quizBuildOptions.difficultyLevel,
                        subtype: current.subtype,
                        snapshot: summarizeQuizQuestionForReport(current),
                      });
                      setReportLogTick((n) => n + 1);
                      setReportStatus("Saved to this device’s QA log. Use “Copy all reports” to export.");
                    }}
                  >
                    Save report
                  </KidButton>
                  <KidButton
                    type="button"
                    variant="secondary"
                    className="!min-h-10 text-sm"
                    onClick={() => {
                      setReportOpen(false);
                      setReportStatus(null);
                    }}
                  >
                    Cancel
                  </KidButton>
                  <KidButton
                    type="button"
                    variant="secondary"
                    className="!min-h-10 text-sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(exportReportsAsJson(loadQuizQuestionReports()));
                        setReportStatus("Copied full log as JSON.");
                      } catch {
                        setReportStatus("Could not copy — select text manually.");
                      }
                    }}
                  >
                    Copy all reports
                  </KidButton>
                  <KidButton
                    type="button"
                    variant="secondary"
                    className="!min-h-10 text-sm"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.confirm("Clear all QA reports on this device?")) {
                        clearQuizQuestionReports();
                        setReportLogTick((n) => n + 1);
                        setReportStatus("QA log cleared.");
                      }
                    }}
                  >
                    Clear log
                  </KidButton>
                </div>
              </KidPanel>
            ) : null}

            <div key={`q-${index}-${current.subtype}`}>
              {!current.image_url?.trim() && activeQuizSeed ? (
                <QuizStickerFallback
                  sticker={pickQuizStickerVisual(current, activeQuizSeed, index)}
                />
              ) : null}
              {current.subtype === "mc_quiz" ? (
                <InteractionFeedbackShell kind={interactionFeedback}>
                  <McQuizView parsed={current} {...nav} {...passHandlers} snappyCorrect />
                </InteractionFeedbackShell>
              ) : null}
              {current.subtype === "fill_blanks" ? (
                <InteractionFeedbackShell kind={interactionFeedback}>
                  <FillBlanksView parsed={current} {...nav} {...passHandlers} submitOnEnter />
                </InteractionFeedbackShell>
              ) : null}
              {current.subtype === "letter_mixup" ? (
                <InteractionFeedbackShell kind={interactionFeedback}>
                  <LetterMixupView parsed={current} {...nav} {...passHandlers} submitOnEnter />
                </InteractionFeedbackShell>
              ) : null}
            </div>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <KidPanel className="max-w-md space-y-4 text-center">
              <p className="text-2xl font-bold">Nice work!</p>
              <p className="text-lg text-neutral-700">You finished this topic&apos;s quiz.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <KidButton type="button" variant="accent" onClick={goToTopics}>
                  Back to topics
                </KidButton>
                <KidButton
                  type="button"
                  disabled={doneReplayLock}
                  onClick={() => {
                    if (doneReplayLock) return;
                    playSfx("tap", muted);
                    if (!selectedTopicId || !quizBuildOptions) {
                      setPhase("topics");
                      return;
                    }
                    setQuestions([]);
                    setIndex(0);
                    resetInteractionState();
                    setPhase("quiz");
                    void loadQuiz(selectedTopicId, quizBuildOptions);
                  }}
                >
                  Play again
                </KidButton>
              </div>
            </KidPanel>
          </div>
        ) : null}
      </main>

      {chaseGameOpen ? (
        <ChaseGameOverlay
          muted={muted}
          onClose={() => {
            playSfx("tap", muted);
            setChaseGameOpen(false);
          }}
          onRewardsGranted={refreshRewardsUi}
        />
      ) : null}
      {wordBucketCatchOpen && bucketGameConfig && bucketCompletionEventId ? (
        <WordBucketCatchOverlay
          muted={muted}
          config={bucketGameConfig}
          completionEventId={bucketCompletionEventId}
          onRewardsGranted={refreshRewardsUi}
          onTestCorrectCatch={() => {
            bumpDailyQuestProgress("bucket_catches", 1);
            refreshRewardsUi();
          }}
          onClose={() => {
            playSfx("tap", muted);
            setWordBucketCatchOpen(false);
            setBucketGameConfig(null);
            setBucketCompletionEventId(null);
          }}
        />
      ) : null}
      {vocabSetOpen && activeVocabSetId && vocabSessionSeed ? (
        <VocabularySetOverlay
          setId={activeVocabSetId}
          sessionSeed={vocabSessionSeed}
          muted={muted}
          onEconomyChange={refreshRewardsUi}
          onRequestNewRun={() => setVocabSessionSeed(newQuizSeed())}
          onClose={() => {
            playSfx("tap", muted);
            setVocabSetOpen(false);
            setActiveVocabSetId(null);
            setVocabSessionSeed(null);
            setPhase(vocabReturnPhase);
            refreshRewardsUi();
          }}
        />
      ) : null}
      {puppetOpen ? (
        <PuppetPresenterOverlay
          scriptId={activePuppetScriptId}
          muted={muted}
          onClose={() => {
            playSfx("tap", muted);
            setPuppetOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

