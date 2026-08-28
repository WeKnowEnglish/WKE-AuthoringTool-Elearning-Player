"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  speakTextAndWait,
  stopSpeaking,
  unlockSpeechSynthesis,
} from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  deterministicShuffle,
  GuideBlock,
  interactionImageFitClass,
  interactionLessonShellClass,
  InteractionShellNav,
  isStageFooterNav,
  type NavProps,
  unopt,
} from "./shared";

type Parsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "listening_item_match" }
>;

export function ListeningItemMatchView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
}: {
  parsed: Parsed;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const stageFooter = isStageFooterNav(controlsPlacement);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clearWrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lockedPromptIds, setLockedPromptIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [wrongPromptIds, setWrongPromptIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [shuffleSeed] = useState(() => {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return String(buffer[0]);
    }
    return String(Date.now());
  });

  const puzzleKey = useMemo(
    () =>
      `${parsed.prompts
        .map((prompt) => `${prompt.id}:${prompt.correct_choice_id}`)
        .join("|")}::${parsed.choices.map((choice) => choice.id).join("|")}`,
    [parsed.choices, parsed.prompts],
  );
  const choices = useMemo(
    () =>
      parsed.shuffle_choices
        ? deterministicShuffle(parsed.choices, `${puzzleKey}:${shuffleSeed}`)
        : parsed.choices,
    [parsed.choices, parsed.shuffle_choices, puzzleKey, shuffleSeed],
  );
  const choiceLetter = useMemo(
    () =>
      new Map(
        choices.map((choice, index) => [
          choice.id,
          String.fromCharCode(65 + index),
        ]),
      ),
    [choices],
  );

  useEffect(() => {
    setAnswers({});
    setLockedPromptIds(new Set());
    setWrongPromptIds(new Set());
    setFeedback(null);
  }, [puzzleKey]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (clearWrongTimerRef.current) clearTimeout(clearWrongTimerRef.current);
      stopSpeaking();
      audio?.pause();
    };
  }, []);

  const playTrack = useCallback(async () => {
    setHasPlayed(true);
    if (muted) return;
    playSfx("tap", muted);
    setPlaying(true);
    try {
      if (parsed.prompt_audio_url?.trim() && audioRef.current) {
        stopSpeaking();
        const audio = audioRef.current;
        audio.currentTime = 0;
        await audio.play();
        await new Promise<void>((resolve) => {
          if (audio.ended || audio.paused) {
            resolve();
            return;
          }
          const done = () => {
            audio.removeEventListener("ended", done);
            resolve();
          };
          audio.addEventListener("ended", done);
        });
      } else if (parsed.dialog_text?.trim()) {
        unlockSpeechSynthesis();
        await speakTextAndWait(parsed.dialog_text, { muted, rate: 0.9 });
      }
    } catch {
      // A failed recording must not prevent the student from completing the task.
    } finally {
      setPlaying(false);
    }
  }, [muted, parsed.dialog_text, parsed.prompt_audio_url]);

  function choose(promptId: string, choiceId: string) {
    if (passed || lockedPromptIds.has(promptId)) return;
    playSfx("tap", muted);
    setFeedback(null);
    setWrongPromptIds(new Set());
    setAnswers((current) => {
      const next = { ...current };
      if (choiceId) {
        for (const prompt of parsed.prompts) {
          if (
            prompt.id !== promptId &&
            next[prompt.id] === choiceId &&
            !lockedPromptIds.has(prompt.id)
          ) {
            delete next[prompt.id];
          }
        }
        next[promptId] = choiceId;
      } else {
        delete next[promptId];
      }
      return next;
    });
  }

  function check() {
    if (passed) return;
    playSfx("tap", muted);
    const correctIds = new Set<string>();
    const wrongIds = new Set<string>();
    for (const prompt of parsed.prompts) {
      if (answers[prompt.id] === prompt.correct_choice_id) {
        correctIds.add(prompt.id);
      } else {
        wrongIds.add(prompt.id);
      }
    }

    if (wrongIds.size === 0) {
      setLockedPromptIds(correctIds);
      setWrongPromptIds(new Set());
      setFeedback("Excellent listening — all five matches are correct!");
      onPass();
      return;
    }

    onWrong();
    setLockedPromptIds((current) => new Set([...current, ...correctIds]));
    setWrongPromptIds(wrongIds);
    setFeedback(
      correctIds.size > 0
        ? "Correct matches stay green. Listen again and retry the others."
        : "Not quite yet. Listen again and check who matches each choice.",
    );
    if (clearWrongTimerRef.current) clearTimeout(clearWrongTimerRef.current);
    clearWrongTimerRef.current = setTimeout(() => {
      setAnswers((current) => {
        const next = { ...current };
        for (const promptId of wrongIds) delete next[promptId];
        return next;
      });
      setWrongPromptIds(new Set());
    }, 700);
  }

  const answeredCount = parsed.prompts.filter((prompt) => answers[prompt.id]).length;

  return (
    <div className={interactionLessonShellClass(controlsPlacement)}>
      {parsed.prompt_audio_url?.trim() ? (
        <audio
          ref={audioRef}
          src={parsed.prompt_audio_url}
          preload="auto"
          className="hidden"
        />
      ) : null}
      <KidPanel
        className={clsx(
          stageFooter &&
            "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto !p-3 sm:!p-4",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-kid-ink sm:text-lg">
              {parsed.body_text?.trim() ||
                "Listen, then match each person to the correct choice."}
            </p>
            <p className="mt-1 text-sm font-semibold text-kid-ink/70">
              Three choices are distractors and will not be used.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-kid-surface-muted px-3 py-1.5 text-sm font-bold text-kid-ink">
              {answeredCount}/5 matched
            </span>
            <KidButton
              type="button"
              variant="accent"
              className="!min-h-10 !min-w-0 px-3 py-1.5 text-sm"
              disabled={playing}
              onClick={() => void playTrack()}
            >
              {playing ? "Playing…" : hasPlayed ? "Replay" : "Listen"}
            </KidButton>
          </div>
        </div>

        <div className="mt-2 grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)]">
          <section
            aria-label="Choices"
            className="grid content-start grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {choices.map((choice) => (
              <article
                key={choice.id}
                className="min-w-0 rounded-xl border-2 border-sky-200 bg-white p-2 shadow-sm"
              >
                {choice.image_url?.trim() ? (
                  <div className="relative mb-1.5 h-16 w-full overflow-hidden rounded-lg bg-slate-50 sm:h-20">
                    <Image
                      src={choice.image_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 45vw, 18vw"
                      className={interactionImageFitClass("contain")}
                      unoptimized={unopt(choice.image_url)}
                    />
                  </div>
                ) : null}
                <p className="truncate text-sm font-bold text-kid-ink" title={choice.label}>
                  <span className="mr-1 text-sky-700">
                    {choiceLetter.get(choice.id)}.
                  </span>
                  {choice.label}
                </p>
              </article>
            ))}
          </section>

          <section
            aria-label="People to match"
            className="grid content-start gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-2"
          >
            {parsed.prompts.map((prompt) => {
              const locked = passed || lockedPromptIds.has(prompt.id);
              const wrong = wrongPromptIds.has(prompt.id);
              return (
                <label
                  key={prompt.id}
                  className={clsx(
                    "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-2 rounded-lg border-2 bg-white p-2",
                    locked
                      ? "border-emerald-500 bg-emerald-50"
                      : wrong
                        ? "border-red-500 bg-red-50"
                        : "border-transparent",
                  )}
                >
                  <span className="truncate text-sm font-bold text-kid-ink" title={prompt.label}>
                    {prompt.label}
                  </span>
                  <select
                    aria-label={`Match for ${prompt.label}`}
                    value={answers[prompt.id] ?? ""}
                    disabled={locked}
                    onChange={(event) => choose(prompt.id, event.target.value)}
                    className="min-h-10 min-w-0 rounded-lg border-2 border-slate-300 bg-white px-2 text-sm font-bold text-kid-ink focus:border-sky-600 focus:outline-none disabled:opacity-80"
                  >
                    <option value="">Choose…</option>
                    {choices.map((choice) => {
                      const usedByOther = parsed.prompts.some(
                        (other) =>
                          other.id !== prompt.id &&
                          answers[other.id] === choice.id,
                      );
                      return (
                        <option
                          key={choice.id}
                          value={choice.id}
                          disabled={usedByOther}
                        >
                          {choiceLetter.get(choice.id)}. {choice.label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              );
            })}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <KidButton
                type="button"
                className="!min-h-10 !min-w-0 px-4 py-1.5 text-sm"
                disabled={passed}
                onClick={check}
              >
                Check matches
              </KidButton>
              {feedback ? (
                <p
                  className={clsx(
                    "min-w-0 flex-1 text-sm font-semibold",
                    passed ? "text-emerald-800" : "text-red-800",
                  )}
                  role="status"
                >
                  {feedback}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionShellNav
        showBack={showBack}
        onBack={onBack}
        passed={passed}
        onNext={onNext}
        controlsPlacement={controlsPlacement}
      />
    </div>
  );
}
