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
import { StickerStorePanel } from "@/components/progress/StickerStorePanel";
import { FillBlanksView } from "@/components/lesson/interactions/FillBlanksView";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { QuizStickerFallback } from "@/components/teststartpage/QuizStickerFallback";
import { playSfx } from "@/lib/audio/sfx";
import { getProgressSnapshot, setAudioMuted } from "@/lib/progress/local-storage";
import {
  applyTestStartQuizCorrectAnswer,
  applyTestStartQuizWrongAnswer,
  getRewards,
  QUIZ_ENERGY_MAX,
} from "@/lib/progress/rewards";
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

type Phase = "splash" | "topics" | "quizOptions" | "quiz" | "done";

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
  const [rewardsUi, setRewardsUi] = useState({ gold: 0, energy: 0, streak: 0 });
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [playerMenuPage, setPlayerMenuPage] = useState<PlayerMenuPage>("root");

  const qaReportCount = useMemo(() => loadQuizQuestionReports().length, [reportLogTick, phase]);

  const refreshRewardsUi = useCallback(() => {
    const r = getRewards();
    setRewardsUi({
      gold: r.gold,
      energy: r.quizEnergy ?? 0,
      streak: r.quizStreak ?? 0,
    });
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
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
    }
    resetInteractionState();
  }, [interactionPass, index, questions.length, muted, resetInteractionState]);

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
      const snap = applyTestStartQuizCorrectAnswer(eventId);
      setRewardsUi({
        gold: snap.gold,
        energy: snap.quizEnergy ?? 0,
        streak: snap.quizStreak ?? 0,
      });
    }
    setInteractionPass(true);
    playSfx("correct", muted);
  }, [phase, activeQuizSeed, selectedTopicId, index, muted]);

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

  useEffect(() => {
    if (phase !== "quiz" || !interactionPass) return;
    if (questions.length === 0 || index >= questions.length - 1) return;
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

  const current = questions[index] ?? null;

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

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7bf4d] text-kid-ink">
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
        </div>
        <KidButton type="button" variant="secondary" className="!min-h-9 shrink-0 text-sm" onClick={toggleMute}>
          {muted ? "Sound off" : "Sound on"}
        </KidButton>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center px-4 py-4 sm:py-6">
        {phase === "splash" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <p className="max-w-md text-center text-2xl font-bold text-kid-ink">Quick quiz</p>
            <button
              type="button"
              className="h-40 w-[40rem] max-w-[96vw] rounded-[999px] border-4 border-[#0a2f86] bg-[#0f4ecf] px-8 text-center text-6xl font-black tracking-wide text-white shadow-[10px_10px_0_#0a2f86] transition-transform [touch-action:manipulation] hover:bg-[#1658dc] active:translate-y-[1px] active:scale-[0.99]"
              onClick={() => {
                playSfx("tap", muted);
                setPhase("topics");
              }}
            >
              PLAY
            </button>
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
                  onClick={() => {
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
    </div>
  );
}
