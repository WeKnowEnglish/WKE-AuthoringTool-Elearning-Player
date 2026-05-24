"use client";

import { clsx } from "clsx";
import { useCallback, useEffect } from "react";
import { speakText, stopSpeaking } from "@/lib/audio/tts";

type Props = {
  line: string;
  speakText: string;
  cueEmoji: string;
  highlightWord?: string;
  slotIndicator?: string;
  muted: boolean;
  className?: string;
};

function RequestLine({
  line,
  highlightWord,
}: {
  line: string;
  highlightWord?: string;
}) {
  if (!highlightWord) {
    return (
      <p className="text-base font-bold leading-snug text-kid-ink sm:text-lg">{line}</p>
    );
  }

  const needle = highlightWord.toLowerCase();
  const lower = line.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) {
    return (
      <p className="text-base font-bold leading-snug text-kid-ink sm:text-lg">{line}</p>
    );
  }

  const before = line.slice(0, idx);
  const word = line.slice(idx, idx + needle.length);
  const after = line.slice(idx + needle.length);

  return (
    <p className="text-base font-bold leading-snug text-kid-ink sm:text-lg">
      {before}
      <span className="text-emerald-700">{word}</span>
      {after}
    </p>
  );
}

export function PetSandwichRequestBubble({
  line,
  speakText: ttsText,
  cueEmoji,
  highlightWord,
  slotIndicator,
  muted,
  className,
}: Props) {
  const replay = useCallback(() => {
    speakText(ttsText, { muted });
  }, [ttsText, muted]);

  useEffect(() => {
    speakText(ttsText, { muted });
    return () => stopSpeaking();
  }, [ttsText, muted]);

  return (
    <button
      type="button"
      className={clsx(
        "w-full rounded-2xl border-4 border-kid-ink bg-white px-4 py-3 text-left shadow-[3px_3px_0_#0a2f86] transition-transform active:scale-[0.99]",
        className,
      )}
      onClick={replay}
      aria-label="Hear again"
    >
      <div role="status" aria-live="polite" className="flex items-start gap-3">
        <span className="text-4xl leading-none sm:text-5xl" aria-hidden>
          {cueEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <RequestLine line={line} highlightWord={highlightWord} />
          {slotIndicator ?
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
              {slotIndicator}
            </p>
          : null}
          <p className="mt-1 text-[10px] font-semibold text-kid-ink/50">Tap to hear again</p>
        </div>
      </div>
    </button>
  );
}
