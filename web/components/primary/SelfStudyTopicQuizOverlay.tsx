"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FillBlanksView } from "@/components/lesson/interactions/FillBlanksView";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import {
  InteractionFeedbackShell,
  type InteractionFeedbackKind,
} from "@/components/kid-ui/InteractionFeedbackShell";
import { PrimaryChrome } from "@/components/primary/PrimaryChrome";
import {
  HomeworkFinishPanel,
  HomeworkProgressBar,
} from "@/components/primary/HomeworkPlayChrome";
import { playSfx } from "@/lib/audio/sfx";
import {
  SELF_STUDY_DEFAULT_DIFFICULTY,
  SELF_STUDY_DEFAULT_QUESTION_COUNT,
} from "@/lib/primary/self-study-topics";
import { getPlayerLevel } from "@/lib/progress/rewards";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";
import { newSessionSeed } from "@/lib/student-hub/session-seed";
import {
  TOPICS,
  type TestStartQuizQuestion,
  type TestStartTopicId,
} from "@/lib/teststartpage/bank";
import { getExcludedRowIdentitiesForQuiz } from "@/lib/teststartpage/quiz-recent-row-exclusions";
import { loadTestStartQuizWithMedia } from "@/lib/teststartpage/load-teststart-quiz-action";

type Props = {
  topicId: TestStartTopicId;
  muted: boolean;
  onClose: () => void;
};

/**
 * Product B — topic quiz player (Self Study).
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export function SelfStudyTopicQuizOverlay({ topicId, muted, onClose }: Props) {
  const topicLabel = TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
  const [questions, setQuestions] = useState<TestStartQuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<InteractionFeedbackKind>("none");
  const [seed, setSeed] = useState(() => newSessionSeed());
  const autoAdvanceRef = useRef<number | null>(null);

  const loadQuiz = useCallback(async (nextSeed: string) => {
    setLoading(true);
    setLoadError(null);
    setQuestions([]);
    setIndex(0);
    setPassed(false);
    setFinished(false);
    setFeedback("none");
    try {
      const buildOptions = {
        questionCount: SELF_STUDY_DEFAULT_QUESTION_COUNT,
        difficultyLevel: SELF_STUDY_DEFAULT_DIFFICULTY,
        excludeRowIdentities: getExcludedRowIdentitiesForQuiz(topicId, {
          questionCount: SELF_STUDY_DEFAULT_QUESTION_COUNT,
          difficultyLevel: SELF_STUDY_DEFAULT_DIFFICULTY,
        }),
      };
      const { questions: next } = await loadTestStartQuizWithMedia(
        topicId,
        nextSeed,
        buildOptions,
      );
      if (next.length === 0) {
        setLoadError("No questions for this topic yet. Try another topic.");
        return;
      }
      setQuestions(next);
    } catch {
      setLoadError("Could not load this quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    if (!isUnlockAvailable("topic_quiz", getPlayerLevel())) {
      setLoading(false);
      setLoadError("This quiz unlocks as you level up.");
      return;
    }
    void loadQuiz(seed);
  }, [loadQuiz, seed]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const goNext = useCallback(() => {
    setPassed(false);
    setFeedback("none");
    setIndex((value) => {
      if (value >= questions.length - 1) {
        setFinished(true);
        return value;
      }
      return value + 1;
    });
  }, [questions.length]);

  useEffect(() => {
    if (!passed || finished) return;
    autoAdvanceRef.current = window.setTimeout(() => {
      autoAdvanceRef.current = null;
      goNext();
    }, 620);
    return () => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [passed, finished, goNext]);

  const current = questions[index] ?? null;

  function handlePass() {
    playSfx("correct", muted);
    setFeedback("correct");
    setPassed(true);
  }

  function handleWrong() {
    playSfx("wrong", muted);
    setFeedback("wrong");
  }

  function handleClose() {
    playSfx("tap", muted);
    onClose();
  }

  function handleReplay() {
    playSfx("tap", muted);
    setSeed(newSessionSeed());
  }

  return (
    <PrimaryChrome
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[var(--pl-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${topicLabel} topic quiz`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--pl-border)] bg-white px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--pl-purple)]">
            Self Study
          </p>
          <p className="truncate text-sm font-extrabold text-[var(--pl-ink)] sm:text-base">
            {topicLabel}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
          onClick={handleClose}
        >
          Close
        </button>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
        {loading ? (
          <div className="m-auto rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-6 py-8 text-center shadow-sm">
            <p className="text-lg font-extrabold text-[var(--pl-ink)]">Loading your quiz…</p>
            <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
              Finding pictures from the media library.
            </p>
          </div>
        ) : null}

        {!loading && loadError ? (
          <div className="m-auto max-w-md space-y-4 rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-6 py-8 text-center shadow-sm">
            <p className="text-lg font-extrabold text-[var(--pl-ink)]">{loadError}</p>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
            >
              Back to Self Study
            </button>
          </div>
        ) : null}

        {!loading && !loadError && finished ? (
          <HomeworkFinishPanel
            title="Nice work!"
            detail={`You finished the ${topicLabel} quiz.`}
            saving={false}
            saved={false}
            saveError={null}
            primaryLabel="Back to Self Study"
            onPrimary={handleClose}
            retryLabel="Play again"
            onRetry={handleReplay}
          />
        ) : null}

        {!loading && !loadError && !finished && current ? (
          <div className="flex flex-col gap-4">
            <HomeworkProgressBar
              label={`Question ${index + 1} of ${questions.length}`}
              current={index + 1}
              total={questions.length}
            />
            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] shadow-sm">
              <InteractionFeedbackShell kind={feedback}>
                {current.subtype === "mc_quiz" ? (
                  <McQuizView
                    key={`${seed}-${index}`}
                    parsed={current}
                    muted={muted}
                    passed={passed}
                    snappyCorrect
                    showBack={index > 0}
                    onBack={() => {
                      if (index <= 0) return;
                      setIndex((value) => value - 1);
                      setPassed(false);
                      setFeedback("none");
                    }}
                    onPass={handlePass}
                    onWrong={handleWrong}
                    onNext={goNext}
                  />
                ) : null}
                {current.subtype === "fill_blanks" ? (
                  <FillBlanksView
                    key={`${seed}-${index}`}
                    parsed={current}
                    muted={muted}
                    passed={passed}
                    submitOnEnter
                    showBack={index > 0}
                    onBack={() => {
                      if (index <= 0) return;
                      setIndex((value) => value - 1);
                      setPassed(false);
                      setFeedback("none");
                    }}
                    onPass={handlePass}
                    onWrong={handleWrong}
                    onNext={goNext}
                  />
                ) : null}
                {current.subtype === "letter_mixup" ? (
                  <LetterMixupView
                    key={`${seed}-${index}`}
                    parsed={current}
                    muted={muted}
                    passed={passed}
                    submitOnEnter
                    showBack={index > 0}
                    onBack={() => {
                      if (index <= 0) return;
                      setIndex((value) => value - 1);
                      setPassed(false);
                      setFeedback("none");
                    }}
                    onPass={handlePass}
                    onWrong={handleWrong}
                    onNext={goNext}
                  />
                ) : null}
              </InteractionFeedbackShell>
            </div>
          </div>
        ) : null}
      </div>
    </PrimaryChrome>
  );
}
