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
import { FillBlanksView } from "@/components/lesson/interactions/FillBlanksView";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { playSfx } from "@/lib/audio/sfx";
import { getProgressSnapshot, setAudioMuted } from "@/lib/progress/local-storage";
import {
  compileQuizForTopicWithDebug,
  DIFFICULTY_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  TOPICS,
  topicImagePlaceholder,
  type QuizBuildOptions,
  type TestStartQuizQuestion,
  type TestStartTopicId,
} from "@/lib/teststartpage/bank";
import { loadTestStartQuizWithMedia } from "@/lib/teststartpage/load-teststart-quiz-action";
import {
  appendQuizQuestionReport,
  clearQuizQuestionReports,
  exportReportsAsJson,
  loadQuizQuestionReports,
  type QuizQuestionReportCategory,
  summarizeQuizQuestionForReport,
} from "@/lib/teststartpage/quiz-question-reports";

type Phase = "splash" | "topics" | "quizOptions" | "quiz" | "done";

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
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qaReportCount = useMemo(() => loadQuizQuestionReports().length, [reportLogTick, phase]);

  useEffect(() => {
    queueMicrotask(() => setMuted(getProgressSnapshot().audioMuted === true));
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
      clearTimeout(autoAdvanceTimerRef.current);
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

  const passHandlers = {
    onPass: () => {
      setInteractionFeedback("correct");
      window.setTimeout(() => setInteractionFeedback("none"), 480);
      setInteractionPass(true);
      playSfx("correct", muted);
    },
    onWrong: () => {
      setInteractionFeedback("wrong");
      window.setTimeout(() => setInteractionFeedback("none"), 360);
      playSfx("wrong", muted);
    },
  };

  useEffect(() => {
    if (phase !== "quiz" || !interactionPass) return;
    if (questions.length === 0 || index >= questions.length - 1) return;
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      goNext();
    }, 620);
    return () => {
      if (autoAdvanceTimerRef.current !== null) {
        clearTimeout(autoAdvanceTimerRef.current);
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
    try {
      const { questions: next } = await loadTestStartQuizWithMedia(id, seed, opts);
      setQuestions(next);
    } catch {
      setQuestions(compileQuizForTopicWithDebug(id, seed, opts).questions);
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

  const optionBtnClass = (active: boolean) =>
    clsx(
      "min-h-14 min-w-[5.5rem] rounded-xl border-4 border-kid-ink px-5 text-lg font-bold transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98]",
      active ? "bg-[#0f4ecf] text-white shadow-[4px_4px_0_#0a2f86]" : "bg-kid-panel",
    );

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7bf4d] text-kid-ink">
      <header className="flex flex-wrap items-center justify-end gap-2 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
        <KidButton type="button" variant="secondary" className="!min-h-9 text-sm" onClick={toggleMute}>
          {muted ? "Sound off" : "Sound on"}
        </KidButton>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-6">
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
          <div className="flex w-full max-w-2xl flex-1 flex-col gap-6">
            <h1 className="text-center text-2xl font-bold">Pick a topic</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={quizLoading}
                  className={clsx(
                    "rounded-xl border-4 border-kid-ink bg-kid-panel px-4 py-4 text-left transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98]",
                    quizLoading && "pointer-events-none opacity-60",
                  )}
                  onClick={() => selectTopic(t.id)}
                >
                  <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden rounded-lg border-2 border-kid-ink/50 bg-white">
                    <NextImage
                      src={topicImagePlaceholder(t.id)}
                      alt={`${t.label} topic image placeholder`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-lg font-bold">{t.label}</p>
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
            <h1 className="text-center text-2xl font-bold">
              {TOPICS.find((t) => t.id === selectedTopicId)?.label ?? selectedTopicId}
            </h1>
            <div className="w-full space-y-3">
              <p className="text-center text-lg font-semibold">How many questions?</p>
              <div className="flex flex-wrap justify-center gap-3">
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
              <p className="text-center text-lg font-semibold">Difficulty</p>
              <div className="flex flex-wrap justify-center gap-3">
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
            <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
              <KidButton type="button" variant="accent" onClick={startQuiz} disabled={quizLoading}>
                Start quiz
              </KidButton>
              <KidButton type="button" variant="secondary" onClick={goBackFromQuizOptions}>
                Back to topics
              </KidButton>
            </div>
          </div>
        ) : null}

        {phase === "quiz" && quizLoading && questions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-xl font-bold text-kid-ink">Loading your quiz…</p>
            <p className="text-sm text-kid-ink/80">Finding pictures from the media library.</p>
          </div>
        ) : null}

        {phase === "quiz" && current ? (
          <div className="w-full max-w-3xl flex-1 space-y-4">
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
