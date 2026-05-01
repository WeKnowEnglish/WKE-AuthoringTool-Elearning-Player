"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { GuideBlock, NavProps, unopt } from "./shared";

export function SoundSortView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "sound_sort" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playSound() {
    playSfx("tap", muted);
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {
      /* ignore autoplay / CORS */
    });
  }

  function pick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (id === parsed.correct_choice_id) onPass();
    else onWrong();
  }

  return (
    <div>
      <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" />
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold text-kid-ink">{parsed.body_text}</p>
        ) : null}
        <div className="mb-6 flex justify-center">
          <KidButton type="button" variant="accent" onClick={playSound}>
            Hear sound
          </KidButton>
        </div>
        <p className="mb-3 text-center text-lg font-bold text-kid-ink">Tap the picture that matches</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {parsed.choices.map((c: (typeof parsed.choices)[number]) => (
            <button
              key={c.id}
              type="button"
              disabled={passed}
              onClick={() => pick(c.id)}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-lg border-4 border-kid-ink bg-kid-panel transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60",
                passed && c.id === parsed.correct_choice_id && "kid-feedback-glow-correct",
              )}
            >
              <Image
                src={c.image_url}
                alt={c.label ?? ""}
                fill
                className="object-cover"
                unoptimized={unopt(c.image_url)}
              />
            </button>
          ))}
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}
