"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import {
  buildGateSpellSprintQueue,
  EXPLORE_GATE_SPRINT_COUNTDOWN_SEC,
  resolveGateSprintOutcome,
} from "@/lib/explore/explore-gate-spell-sprint";
import { playSfx } from "@/lib/audio/sfx";
import type { ExploreGate } from "@/lib/lesson-schemas";
import type { ScreenPayload } from "@/lib/lesson-schemas";

type Props = {
  gate: ExploreGate;
  gates: ExploreGate[];
  gateIndex: number;
  gateCount: number;
  shuffleSeed: string;
  muted: boolean;
  locked: boolean;
  overlayOnRun?: boolean;
  onSprintComplete: (wordsCorrect: number, outcome: "dodge" | "hit") => void;
};

export function ExploreGatePanel({
  gate,
  gates,
  gateIndex,
  gateCount,
  shuffleSeed,
  muted,
  locked,
  overlayOnRun = false,
  onSprintComplete,
}: Props) {
  const timeLimit = gate.time_limit_sec ?? 10;
  const minWordsToClear = gate.min_words_to_clear ?? 1;
  /** First gate only — later gates go straight into the spell sprint. */
  const skipCountdown = gateIndex > 0;
  const [countdown, setCountdown] = useState(() =>
    skipCountdown ? 0 : EXPLORE_GATE_SPRINT_COUNTDOWN_SEC,
  );
  const [sprintActive, setSprintActive] = useState(skipCountdown);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const [wordsCorrect, setWordsCorrect] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [sprintEnded, setSprintEnded] = useState(false);
  const endedRef = useRef(false);
  const wordsCorrectRef = useRef(0);
  const onSprintCompleteRef = useRef(onSprintComplete);
  wordsCorrectRef.current = wordsCorrect;
  onSprintCompleteRef.current = onSprintComplete;

  const sprintQueue = useMemo(
    () => buildGateSpellSprintQueue(gates, shuffleSeed),
    [gates, shuffleSeed],
  );

  const currentWord = sprintQueue[wordIndex % Math.max(1, sprintQueue.length)];

  useEffect(() => {
    setCountdown(skipCountdown ? 0 : EXPLORE_GATE_SPRINT_COUNTDOWN_SEC);
    setSprintActive(skipCountdown);
    setSecondsLeft(timeLimit);
    setWordsCorrect(0);
    setWordIndex(0);
    setSprintEnded(false);
    endedRef.current = false;
  }, [gate.id, timeLimit, shuffleSeed, skipCountdown]);

  useEffect(() => {
    if (skipCountdown || locked || sprintActive || sprintEnded) return;
    if (countdown <= 0) {
      setSprintActive(true);
      playSfx("correct", muted);
      return;
    }
    playSfx("tap", muted);
    const id = window.setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [countdown, locked, sprintActive, sprintEnded, muted, skipCountdown]);

  useEffect(() => {
    if (locked || !sprintActive || sprintEnded) return;
    const deadlineMs = timeLimit * 1000;
    const started = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - started;
      const left = Math.max(0, timeLimit - Math.floor(elapsed / 1000));
      setSecondsLeft(left);
      if (elapsed >= deadlineMs) {
        window.clearInterval(id);
        if (endedRef.current || locked) return;
        endedRef.current = true;
        setSprintEnded(true);
        const count = wordsCorrectRef.current;
        const outcome = resolveGateSprintOutcome(count, minWordsToClear);
        onSprintCompleteRef.current(count, outcome);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [gate.id, timeLimit, locked, sprintActive, sprintEnded, minWordsToClear]);

  const handleWordComplete = useCallback(() => {
    if (!sprintActive || sprintEnded || endedRef.current) return;
    playSfx("correct", muted);
    setWordsCorrect((n) => n + 1);
    setWordIndex((i) => i + 1);
  }, [muted, sprintActive, sprintEnded]);

  const letterMixupPayload = useMemo((): Extract<
    ScreenPayload,
    { type: "interaction"; subtype: "letter_mixup" }
  > | null => {
    if (!currentWord || !sprintActive) return null;
    return {
      type: "interaction",
      subtype: "letter_mixup",
      prompt: gate.prompt || "Spell as many words as you can!",
      image_fit: "contain",
      image_use_tts: false,
      shuffle_letters: true,
      letter_shuffle_seed: `${shuffleSeed}:w${wordIndex}`,
      case_sensitive: false,
      items: [
        {
          id: `${currentWord.id}:${wordIndex}`,
          target_word: currentWord.target_word,
          accepted_words: currentWord.accepted_words,
          hint: currentWord.hint,
        },
      ],
    };
  }, [currentWord, gate.prompt, shuffleSeed, wordIndex, sprintActive]);

  const pct = timeLimit > 0 ? (secondsLeft / timeLimit) * 100 : 0;

  const countdownOverlay = !skipCountdown && !sprintActive && !sprintEnded && (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/25"
      role="status"
      aria-live="assertive"
      aria-label={countdown > 0 ? `Starting in ${countdown}` : "Go"}
    >
      <p className="text-sm font-extrabold uppercase tracking-widest text-white drop-shadow-md">
        Get ready
      </p>
      <p className="mt-2 text-8xl font-extrabold tabular-nums text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] sm:text-9xl">
        {countdown > 0 ? countdown : "Go!"}
      </p>
    </div>
  );

  const timerChip =
    sprintActive ?
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="rounded-full border-2 border-white/90 bg-white/85 px-3 py-1 text-xs font-bold text-sky-900 shadow-sm">
          {wordsCorrect} spelled
        </p>
        <div
          className="flex items-center gap-2 rounded-full border-2 border-white/90 bg-white/90 px-2 py-1 shadow-md"
          role="timer"
          aria-live="polite"
          aria-label={`${secondsLeft} seconds left, ${wordsCorrect} words spelled`}
        >
          <div className="relative h-9 w-9">
            <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" stroke="#bae6fd" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#0369a1"
                strokeWidth="3"
                strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums text-sky-900">
              {secondsLeft}
            </span>
          </div>
          <span className="pr-1 text-xs font-bold uppercase tracking-wide text-sky-800">sec</span>
        </div>
      </div>
    : <p className="rounded-full border-2 border-white/90 bg-white/90 px-3 py-1 text-xs font-bold text-sky-900 shadow-md">
        Starting…
      </p>;

  const mixup =
    letterMixupPayload && !sprintEnded ?
      <LetterMixupView
        key={`${gate.id}-sprint-${wordIndex}`}
        parsed={letterMixupPayload}
        muted={muted}
        passed={false}
        onPass={() => {}}
        onWrong={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        showBack={false}
        controlsPlacement="stage-footer"
        embeddedMode
        exploreCloudLayout={overlayOnRun}
        spellSprintMode
        onWordComplete={handleWordComplete}
        suppressWrongCallback
      />
    : null;

  if (overlayOnRun) {
    return (
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-20 flex flex-col",
          sprintEnded && "opacity-0",
        )}
      >
        {countdownOverlay}
        <div className="pointer-events-none flex shrink-0 items-start justify-between gap-2 p-2">
          <p className="rounded-full border-2 border-white/90 bg-white/85 px-3 py-1 text-xs font-bold text-sky-900 shadow-sm">
            Gate {gateIndex + 1} / {gateCount}
          </p>
          <div className="pointer-events-auto">{timerChip}</div>
        </div>
        <div className="pointer-events-auto min-h-0 flex-1">{mixup}</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {countdownOverlay}
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2">
        <p className="text-sm font-bold text-amber-950">
          Gate {gateIndex + 1} of {gateCount}
        </p>
        {timerChip}
      </div>
      <div
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto",
          sprintEnded && "pointer-events-none opacity-80",
        )}
      >
        {mixup}
      </div>
    </div>
  );
}
