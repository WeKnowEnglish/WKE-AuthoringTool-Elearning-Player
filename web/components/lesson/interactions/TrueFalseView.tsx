"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx, primeAudioOutput } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait, stopSpeaking } from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { VOCAB_LEARN_PAGE_BACKGROUND } from "@/lib/vocabulary-templates/vocab-learn-new-word";
import { vocabTfThumbImageUrl } from "@/lib/vocabulary-templates/vocab-tf-media";
import {
  GuideBlock,
  interactionImageFitClass,
  interactionImmersiveStageClass,
  InteractionLessonNav,
  InteractionStageFooter,
  interactionNavReservePaddingClass,
  NavProps,
  pulseInteractionHero,
  STAGE_OVERLAY_BTN,
  unopt,
} from "./shared";

export function TrueFalseView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
  ttsLang = "en-US",
  snappyCorrect = false,
  correctiveOnWrong = false,
  vocabStageTint = false,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "true_false" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
  /** When true, correct pass speaks the statement without blocking on TTS end. */
  snappyCorrect?: boolean;
  /** Speak `picture_truth_statement` after a wrong tap. */
  correctiveOnWrong?: boolean;
  /** Light blue stage (matches vocab learn screen). */
  vocabStageTint?: boolean;
  ttsLang?: string;
} & NavProps) {
  const immersive = controlsPlacement === "stage-footer";
  const [wrongChoice, setWrongChoice] = useState<"true" | "false" | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const wrongFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroFrameRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const triggerBuzz = useCallback(() => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate([80, 50, 100]);
  }, []);

  useEffect(() => {
    return () => {
      if (wrongFlashTimerRef.current) {
        clearTimeout(wrongFlashTimerRef.current);
      }
    };
  }, []);

  const statementLine = parsed.statement.trim();

  const speakStatement = useCallback(
    (line: string) => {
      if (!line || muted) return;
      primeAudioOutput();
      speakText(line, { lang: ttsLang, muted });
    },
    [muted, ttsLang],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setWrongChoice(null);
      setIsResolving(false);
    });
    if (wrongFlashTimerRef.current) {
      clearTimeout(wrongFlashTimerRef.current);
      wrongFlashTimerRef.current = null;
    }

    if (!statementLine || muted) return;
    const enterTimer = window.setTimeout(() => speakStatement(statementLine), 120);
    return () => {
      window.clearTimeout(enterTimer);
      stopSpeaking();
    };
  }, [muted, parsed.correct, parsed.image_fit, parsed.image_url, speakStatement, statementLine]);

  const completePass = useCallback(async () => {
    setIsResolving(true);
    pulseInteractionHero(heroFrameRef.current, prefersReducedMotion);
    if (statementLine && !muted) {
      if (snappyCorrect) {
        speakStatement(statementLine);
      } else {
        await speakTextAndWait(statementLine, { lang: ttsLang, muted });
      }
    }
    onPass();
    setIsResolving(false);
  }, [
    muted,
    onPass,
    prefersReducedMotion,
    snappyCorrect,
    speakStatement,
    statementLine,
    ttsLang,
  ]);

  const flashWrongChoice = useCallback(
    (which: "true" | "false") => {
      setWrongChoice(which);
      triggerBuzz();
      playSfx("wrong", muted);
      onWrong();
      const anchor = parsed.picture_truth_statement?.trim();
      if (correctiveOnWrong && anchor && !muted) {
        speakText(anchor, { lang: ttsLang, muted });
      }
      if (wrongFlashTimerRef.current) {
        clearTimeout(wrongFlashTimerRef.current);
      }
      wrongFlashTimerRef.current = setTimeout(() => {
        setWrongChoice((current) => (current === which ? null : current));
      }, 460);
    },
    [correctiveOnWrong, muted, onWrong, parsed.picture_truth_statement, triggerBuzz, ttsLang],
  );

  const wrongButtonClass = (which: "true" | "false") =>
    clsx(
      immersive && STAGE_OVERLAY_BTN,
      immersive ? "min-w-[5.5rem]" : "min-w-[8rem]",
      wrongChoice === which && "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
    );

  const answerButtons = (
    <div className="flex flex-wrap justify-center gap-3">
      <KidButton
        type="button"
        variant="secondary"
        disabled={passed || isResolving}
        className={wrongButtonClass("true")}
        onClick={async () => {
          if (passed || isResolving) return;
          playSfx("tap", muted);
          if (parsed.correct) {
            await completePass();
            return;
          }
          flashWrongChoice("true");
        }}
      >
        True
      </KidButton>
      <KidButton
        type="button"
        variant="secondary"
        disabled={passed || isResolving}
        className={wrongButtonClass("false")}
        onClick={async () => {
          if (passed || isResolving) return;
          playSfx("tap", muted);
          if (!parsed.correct) {
            await completePass();
            return;
          }
          flashWrongChoice("false");
        }}
      >
        False
      </KidButton>
    </div>
  );

  const statementButton = (
    <button
      type="button"
      disabled={passed || isResolving}
      onClick={() => speakStatement(statementLine)}
      className={clsx(
        "max-w-4xl font-semibold text-kid-ink underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none disabled:opacity-70",
        immersive ?
          "text-center text-4xl leading-tight sm:text-5xl md:text-6xl"
        : "w-full text-center text-xl",
      )}
      aria-label="Listen again"
    >
      {parsed.statement}
    </button>
  );

  const questionBlock = (
    <div
      className={clsx(
        "flex w-full flex-col items-center gap-5",
        immersive ? "px-3 py-2" : "mt-4",
      )}
    >
      {statementButton}
      {answerButtons}
    </div>
  );

  const statementPanel = (
    <KidPanel className={clsx(!immersive && "mt-4")}>
      {questionBlock}
    </KidPanel>
  );

  const replayFromImageTap = useCallback(() => {
    if (passed || isResolving || !statementLine) return;
    playSfx("tap", muted);
    speakStatement(statementLine);
  }, [isResolving, muted, passed, speakStatement, statementLine]);

  const heroImageButton =
    parsed.image_url ?
      <button
        type="button"
        disabled={passed || isResolving}
        onClick={replayFromImageTap}
        aria-label="Listen again"
        className={clsx(
          "block w-full cursor-pointer rounded-lg border-0 bg-transparent p-0 text-left",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kid-ink",
          "disabled:cursor-default disabled:opacity-70",
          immersive && "mx-auto max-w-2xl shrink-0",
          !immersive && "mb-4",
        )}
      >
        <div
          ref={heroFrameRef}
          className={clsx(
            "relative w-full overflow-hidden rounded-lg border-4 border-kid-ink",
            "aspect-video",
          )}
          style={
            immersive ?
              { maxHeight: "min(36dvh, calc((100vw - 3rem) * 9 / 16))" }
            : undefined
          }
        >
          <Image
            src={parsed.image_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 42rem"
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
          {parsed.thumb_cue ? (
            <span
              className="pointer-events-none absolute bottom-2 right-2 z-10 sm:bottom-3 sm:right-3"
              aria-hidden
            >
              <Image
                src={vocabTfThumbImageUrl(parsed.thumb_cue)}
                alt=""
                width={80}
                height={80}
                className="h-14 w-14 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:h-[4.25rem] sm:w-[4.25rem]"
                unoptimized
              />
            </span>
          ) : null}
        </div>
      </button>
    : null;

  const stageTintStyle =
    vocabStageTint ? { backgroundColor: VOCAB_LEARN_PAGE_BACKGROUND } : undefined;

  if (immersive) {
    return (
      <div
        className={clsx(
          interactionImmersiveStageClass,
          vocabStageTint && "rounded-lg px-2 py-2 sm:px-3",
        )}
        style={stageTintStyle}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {heroImageButton}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            {questionBlock}
          </div>
        </div>
        <InteractionStageFooter showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
      </div>
    );
  }

  return (
    <div className={interactionNavReservePaddingClass}>
      {heroImageButton}
      {statementPanel}
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
