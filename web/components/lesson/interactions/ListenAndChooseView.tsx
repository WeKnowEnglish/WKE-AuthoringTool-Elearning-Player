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
  GuideBlock,
  deterministicShuffle,
  interactionImageFitClass,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

export function ListenAndChooseView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_and_choose" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wrongFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [wrongChoiceId, setWrongChoiceId] = useState<string | null>(null);
  const [shuffleSeed] = useState(() => {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return String(buf[0]);
    }
    return String(Date.now());
  });

  useEffect(() => {
    return () => {
      if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
    };
  }, []);

  const audioUrl = parsed.prompt_audio_url?.trim() || null;
  const dialogText = parsed.dialog_text?.trim() || null;

  const displayChoices = useMemo(() => {
    if (!parsed.shuffle_choices) return parsed.choices;
    return deterministicShuffle(parsed.choices, `${parsed.correct_choice_id}:${shuffleSeed}`);
  }, [parsed.choices, parsed.correct_choice_id, parsed.shuffle_choices, shuffleSeed]);

  const playDialog = useCallback(async () => {
    if (muted) {
      setHasPlayed(true);
      return;
    }
    playSfx("tap", muted);
    setPlaying(true);
    try {
      if (audioUrl && audioRef.current) {
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
      } else if (dialogText) {
        unlockSpeechSynthesis();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        await speakTextAndWait(dialogText, { muted, rate: 0.92 });
      }
    } finally {
      setPlaying(false);
      setHasPlayed(true);
    }
  }, [audioUrl, dialogText, muted]);

  useEffect(() => {
    stopSpeaking();
    setHasPlayed(false);
    setPlaying(false);
    if (!parsed.auto_play || muted) return;
    const timer = window.setTimeout(() => {
      void playDialog();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      stopSpeaking();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
    // Only auto-play when the prompt identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.dialog_text, parsed.prompt_audio_url, parsed.auto_play, muted]);

  function pick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (id === parsed.correct_choice_id) {
      setWrongChoiceId(null);
      onPass();
      return;
    }
    setWrongChoiceId(id);
    onWrong();
    if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
    wrongFlashTimerRef.current = setTimeout(() => {
      setWrongChoiceId((current) => (current === id ? null : current));
    }, 460);
  }

  return (
    <div className={interactionNavReservePaddingClass}>
      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />
      ) : null}
      <KidPanel>
        <p className="mb-4 text-center text-xl font-semibold text-kid-ink">
          {parsed.body_text?.trim() || "Listen, then choose the picture."}
        </p>
        <div className="mb-6 flex justify-center">
          <KidButton
            type="button"
            variant="accent"
            disabled={playing}
            onClick={() => void playDialog()}
          >
            {playing ? "Playing…" : hasPlayed ? "Replay" : "Listen"}
          </KidButton>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
          {displayChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={passed}
              onClick={() => pick(choice.id)}
              aria-label={choice.label ?? `Choice ${choice.id}`}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-xl border-4 border-kid-ink bg-kid-panel transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60",
                wrongChoiceId === choice.id &&
                  "border-red-600 kid-animate-shake ring-4 ring-red-300",
                passed &&
                  choice.id === parsed.correct_choice_id &&
                  "kid-feedback-glow-correct",
              )}
            >
              <Image
                src={choice.image_url}
                alt={choice.label ?? ""}
                fill
                className={interactionImageFitClass(parsed.image_fit)}
                unoptimized={unopt(choice.image_url)}
              />
            </button>
          ))}
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
