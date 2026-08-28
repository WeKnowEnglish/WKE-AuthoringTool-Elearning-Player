"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait, stopSpeaking } from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  interactionImageFitClass,
  interactionLessonShellClass,
  InteractionShellNav,
  isStageFooterNav,
  NavProps,
  unopt,
  deterministicShuffle,
} from "./shared";

const lastMcQuizOrderBySignature = new Map<string, string>();

function orderSignature(options: { id: string }[]): string {
  return options.map((o) => o.id).join("|");
}

/** Bigger/bolder for short answers; scales down so longer phrases still fit the cell. */
function optionLabelClass(label: string): string {
  const len = label.trim().length;
  if (len <= 8) {
    return "text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl";
  }
  if (len <= 16) {
    return "text-xl font-extrabold leading-snug sm:text-2xl md:text-3xl";
  }
  if (len <= 28) {
    return "text-lg font-bold leading-snug sm:text-xl md:text-2xl";
  }
  return "text-base font-bold leading-snug sm:text-lg";
}

export function McQuizView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
  /** When true, correct answer does not block on TTS (snappier quizzes). */
  snappyCorrect,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "mc_quiz" }>;
  muted: boolean;
  passed: boolean;
  onPass: (selectedOptionId?: string) => void;
  onWrong: (selectedOptionId?: string) => void;
  snappyCorrect?: boolean;
} & NavProps) {
  const stageFooter = isStageFooterNav(controlsPlacement);
  const shellClass = interactionLessonShellClass(controlsPlacement);
  const panelClass = stageFooter ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined;
  const optionsSignature = useMemo(
    () => JSON.stringify(parsed.options.map((opt: { id: string; label: string }) => [opt.id, opt.label])),
    [parsed.options],
  );
  const [wrongOptionId, setWrongOptionId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const wrongFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState("initial");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingPrompt, setPlayingPrompt] = useState(false);
  const [hasPlayedPrompt, setHasPlayedPrompt] = useState(false);

  const audioUrl = parsed.prompt_audio_url?.trim() || null;
  const imageUrl = parsed.image_url?.trim() || null;

  const triggerBuzz = useCallback(() => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate([80, 50, 100]);
  }, []);

  /** Play recorded prompt audio (if any). Returns when playback ends or fails. */
  const playRecordedPrompt = useCallback(async () => {
    if (!audioUrl || !audioRef.current || muted) return;
    stopSpeaking();
    const el = audioRef.current;
    el.currentTime = 0;
    try {
      await el.play();
      await new Promise<void>((resolve) => {
        if (el.ended || el.paused) {
          resolve();
          return;
        }
        const done = () => {
          el.removeEventListener("ended", done);
          resolve();
        };
        el.addEventListener("ended", done);
      });
    } catch {
      /* ignore autoplay / CORS */
    }
  }, [audioUrl, muted]);

  const playPrompt = useCallback(async () => {
    if (!audioUrl) return;
    if (muted) {
      setHasPlayedPrompt(true);
      return;
    }
    playSfx("tap", muted);
    setPlayingPrompt(true);
    try {
      await playRecordedPrompt();
    } finally {
      setPlayingPrompt(false);
      setHasPlayedPrompt(true);
    }
  }, [audioUrl, muted, playRecordedPrompt]);

  useEffect(() => {
    return () => {
      if (wrongFlashTimerRef.current) {
        clearTimeout(wrongFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setWrongOptionId(null);
      setIsResolving(false);
      setPlayingPrompt(false);
      setHasPlayedPrompt(false);
    });
    stopSpeaking();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (wrongFlashTimerRef.current) {
      clearTimeout(wrongFlashTimerRef.current);
      wrongFlashTimerRef.current = null;
    }
  }, [parsed.question, optionsSignature, parsed.correct_option_id, parsed.prompt_audio_url]);

  useEffect(() => {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    queueMicrotask(() => {
      setShuffleSeed(`${buf[0].toString(36)}-${buf[1].toString(36)}`);
    });
  }, [parsed.question, parsed.image_url, optionsSignature, parsed.shuffle_options]);
  const displayOptions = useMemo(() => {
    if (!parsed.shuffle_options) return parsed.options;
    const quizSig = optionsSignature;
    const prevOrder = lastMcQuizOrderBySignature.get(quizSig) ?? null;

    // Keep order stable during one loaded attempt, but pick a new order on the next load.
    let next = deterministicShuffle(parsed.options, `${optionsSignature}:${shuffleSeed}`);
    let nextOrder = orderSignature(next);

    // If we happened to pick the same order as the previous load, retry with a different seed.
    // This avoids "it looks like it didn't shuffle" when there are only 2 options.
    if (prevOrder && nextOrder === prevOrder && parsed.options.length > 1) {
      for (let i = 0; i < 4; i += 1) {
        next = deterministicShuffle(parsed.options, `${optionsSignature}:${shuffleSeed}:${i + 1}`);
        nextOrder = orderSignature(next);
        if (nextOrder !== prevOrder) break;
      }
    }

    lastMcQuizOrderBySignature.set(quizSig, nextOrder);
    return next;
  }, [parsed.shuffle_options, parsed.options, optionsSignature, shuffleSeed]);

  async function pickOption(opt: { id: string; label: string }) {
    if (passed || isResolving) return;
    playSfx("tap", muted);
    if (opt.id === parsed.correct_option_id) {
      setIsResolving(true);
      // Prefer teacher-recorded prompt audio over TTS for the correct-answer confirm.
      if (audioUrl) {
        if (snappyCorrect) {
          void playRecordedPrompt();
          onPass(opt.id);
        } else {
          await playRecordedPrompt();
          onPass(opt.id);
        }
      } else if (snappyCorrect) {
        speakText(opt.label, { muted });
        onPass(opt.id);
      } else {
        await speakTextAndWait(opt.label, { muted });
        onPass(opt.id);
      }
      setIsResolving(false);
      return;
    }
    setWrongOptionId(opt.id);
    triggerBuzz();
    onWrong(opt.id);
    if (wrongFlashTimerRef.current) {
      clearTimeout(wrongFlashTimerRef.current);
    }
    wrongFlashTimerRef.current = setTimeout(() => {
      setWrongOptionId((current) => (current === opt.id ? null : current));
    }, 460);
  }

  const optionButtons = (
    <div
      className={clsx(
        "grid grid-cols-2 gap-3",
        imageUrl && "md:h-full md:min-h-[min(52dvh,28rem)]",
      )}
    >
      {displayOptions.map((opt: { id: string; label: string }) => (
        <KidButton
          key={opt.id}
          type="button"
          variant="secondary"
          disabled={passed || isResolving}
          className={clsx(
            "!flex !min-h-[4.5rem] !min-w-0 h-full w-full items-center justify-center !bg-[#f9f0e8] px-2 py-3 text-center hover:!bg-[#f3e6d8] active:!bg-[#eddcc8] sm:px-3 sm:py-4",
            wrongOptionId === opt.id &&
              "!border-red-600 !bg-red-100 text-red-900 kid-animate-shake hover:!bg-red-100",
          )}
          onClick={() => void pickOption(opt)}
        >
          <span className={clsx("max-w-full break-words hyphens-auto", optionLabelClass(opt.label))}>
            {opt.label}
          </span>
        </KidButton>
      ))}
    </div>
  );

  return (
    <div className={shellClass}>
      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />
      ) : null}
      <KidPanel className={panelClass}>
        {parsed.body_text?.trim() ? (
          <p className="mb-2 text-base font-semibold text-kid-ink/70">{parsed.body_text.trim()}</p>
        ) : null}
        <p
          className={clsx(
            "mb-3 font-extrabold leading-snug text-kid-ink",
            stageFooter ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
          )}
        >
          {parsed.question}
        </p>
        {audioUrl ? (
          <div className="mb-4 flex justify-center sm:justify-start">
            <KidButton
              type="button"
              variant="accent"
              disabled={playingPrompt}
              onClick={() => void playPrompt()}
            >
              {playingPrompt ? "Playing…" : hasPlayedPrompt ? "Replay" : "Listen"}
            </KidButton>
          </div>
        ) : null}

        {imageUrl ? (
          <div
            className={clsx(
              "mt-2 grid gap-4 md:grid-cols-2 md:items-stretch md:gap-5",
              stageFooter && "min-h-0 flex-1",
            )}
          >
            <div
              className={clsx(
                "relative aspect-square w-full overflow-hidden rounded-lg border-4 border-kid-ink bg-[#eef3f9] shadow-[inset_3px_-3px_2px_rgba(0,0,0,0.18)] sm:aspect-[4/3]",
                stageFooter
                  ? "md:aspect-auto md:min-h-0 md:flex-1"
                  : "md:aspect-auto md:min-h-[min(52dvh,28rem)]",
              )}
            >
              <Image
                src={imageUrl}
                alt=""
                fill
                className={interactionImageFitClass("contain")}
                unoptimized={unopt(imageUrl)}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {optionButtons}
          </div>
        ) : (
          <div className="mt-2">{optionButtons}</div>
        )}
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
