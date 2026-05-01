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
import { GuideBlock, NavProps, unopt, deterministicShuffle } from "./shared";

export function WordShapeHuntView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "word_shape_hunt" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const chunks = useMemo(
    () => (parsed.shuffle_chunks ? deterministicShuffle(parsed.word_chunks, parsed.prompt) : parsed.word_chunks),
    [parsed.shuffle_chunks, parsed.word_chunks, parsed.prompt],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle(id: string) {
    if (passed) return;
    playSfx("tap", muted);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function check() {
    playSfx("tap", muted);
    const selected = chunks.filter((c) => picked.has(c.id));
    const ok =
      selected.every((c) => c.is_vocab) &&
      chunks.filter((c) => c.is_vocab).every((c) => picked.has(c.id));
    if (ok) onPass();
    else onWrong();
  }
  const layoutClass =
    parsed.shape_layout === "circle"
      ? "rounded-full p-8"
      : parsed.shape_layout === "wave"
        ? "items-end"
        : "";

  return (
    <div>
      {parsed.prompt_audio_url ? <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" /> : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {parsed.prompt_audio_url ? (
          <KidButton type="button" variant="accent" className="mt-3" onClick={() => { const el = audioRef.current; if (!el) return; el.currentTime = 0; void el.play().catch(() => null); }}>
            Play prompt audio
          </KidButton>
        ) : null}
        <div className={clsx("mt-4 flex flex-wrap gap-2", layoutClass)}>
          {chunks.map((c, i) => (
            <button
              key={c.id}
              type="button"
              disabled={passed}
              onClick={() => toggle(c.id)}
              className={clsx(
                "rounded-full border-2 px-3 py-1.5 text-sm font-semibold",
                picked.has(c.id) ? "border-kid-ink bg-kid-accent/50" : "border-neutral-300 bg-white",
                parsed.shape_layout === "wave" && (i % 2 === 0 ? "translate-y-2" : "-translate-y-1"),
              )}
            >
              {c.text}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}
