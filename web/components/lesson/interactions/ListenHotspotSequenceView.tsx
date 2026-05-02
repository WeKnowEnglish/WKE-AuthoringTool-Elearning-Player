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
import { GuideBlock, interactionImageFitClass, NavProps, unopt } from "./shared";

export function ListenHotspotSequenceView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_hotspot_sequence" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [clickedOrder, setClickedOrder] = useState<string[]>([]);

  function playPrompt() {
    playSfx("tap", muted);
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => null);
  }

  function onTargetClick(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    const nextIdx = clickedOrder.length;
    if (parsed.order[nextIdx] === id) {
      const next = [...clickedOrder, id];
      setClickedOrder(next);
      if (next.length === parsed.order.length) onPass();
      return;
    }
    setClickedOrder([]);
    onWrong();
  }

  return (
    <div>
      <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" />
      <KidPanel>
        {parsed.body_text ? <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p> : null}
        <div className="mb-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="accent"
            onClick={playPrompt}
            disabled={!parsed.allow_replay && clickedOrder.length > 0}
          >
            Play prompt audio
          </KidButton>
          {!parsed.allow_replay && clickedOrder.length > 0 ? (
            <p className="text-sm text-neutral-600">Replay disabled by teacher after starting.</p>
          ) : null}
          <p className="text-sm font-semibold text-kid-ink">
            Progress: {clickedOrder.length}/{parsed.order.length}
          </p>
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt="Scene"
            fill
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
          {parsed.targets.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={passed}
              className="absolute border-4 border-dashed border-amber-600 bg-amber-200/40 hover:bg-amber-300/50 disabled:opacity-60"
              style={{
                left: `${t.x_percent}%`,
                top: `${t.y_percent}%`,
                width: `${t.w_percent}%`,
                height: `${t.h_percent}%`,
              }}
              onClick={() => onTargetClick(t.id)}
              aria-label={t.label ?? "Target"}
            />
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
