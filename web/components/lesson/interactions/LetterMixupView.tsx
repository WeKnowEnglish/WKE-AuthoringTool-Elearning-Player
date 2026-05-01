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

export function LetterMixupView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "letter_mixup" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const item = parsed.items[0];
  const targetWord = item?.target_word ?? "";
  const targetChars = useMemo(() => targetWord.split(""), [targetWord]);
  const letters = useMemo(() => {
    const split = targetChars;
    return parsed.shuffle_letters ? deterministicShuffle([...split], targetWord) : split;
  }, [parsed.shuffle_letters, targetChars, targetWord]);
  const lettersKey = useMemo(() => letters.map((ch, i) => `${i}:${ch}`).join("|"), [letters]);

  type WordCell = { traySlotKey: string; char: string; locked: boolean };
  const [wordSlots, setWordSlots] = useState<(WordCell | null)[]>([]);
  const [shakingSlotIndices, setShakingSlotIndices] = useState<Set<number>>(() => new Set());
  const kickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setWordSlots(Array.from({ length: Math.max(1, targetChars.length) }, () => null));
      setShakingSlotIndices(new Set());
    });
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
  }, [lettersKey, targetChars.length]);

  /** Spelling row: tiles share width and shrink (clamp text) so long words don’t wrap awkwardly. */
  const letterTilesRowClass =
    "flex w-full min-w-0 flex-nowrap items-stretch justify-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]";
  const letterTileClass =
    "box-border flex h-12 min-h-[2.5rem] w-full min-w-[1.125rem] max-h-12 flex-[1_1_0] basis-0 touch-manipulation select-none items-center justify-center overflow-hidden rounded-xl border-2 border-sky-500 bg-white px-0.5 text-[clamp(0.75rem,2.8vmin,1.5rem)] font-bold leading-none text-kid-ink shadow-sm transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

  /** Tray: tile size computed once from full word length + row width; stays fixed while spelling (only re-centers). */
  const trayTilesRowClass =
    "flex w-full min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]";
  const TRAY_GAP_PX = 4;
  const trayLetterTileClass =
    "box-border flex shrink-0 touch-manipulation select-none items-center justify-center rounded-xl border-2 border-sky-500 bg-white font-bold leading-none text-kid-ink shadow-sm transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

  const trayRowRef = useRef<HTMLDivElement>(null);
  const [trayTileSizePx, setTrayTileSizePx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const n = letters.length;
    if (n === 0) {
      queueMicrotask(() => setTrayTileSizePx(null));
      return;
    }
    const el = trayRowRef.current;
    if (!el) return;

    const compute = (): boolean => {
      const w = el.clientWidth;
      if (w <= 0) return false;
      const totalGaps = Math.max(0, n - 1) * TRAY_GAP_PX;
      const raw = Math.floor((w - totalGaps) / n);
      const clamped = Math.min(48, Math.max(26, raw));
      queueMicrotask(() => {
        setTrayTileSizePx(clamped);
      });
      return true;
    };

    if (!compute()) {
      requestAnimationFrame(() => {
        compute();
      });
    }

    const ro = new ResizeObserver(() => {
      compute();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [lettersKey, letters.length]);

  function trayKeyInUse(traySlotKey: string) {
    return wordSlots.some((s) => s?.traySlotKey === traySlotKey);
  }

  function runLetterCheck(slots: (WordCell | null)[]) {
    if (passed) return;
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
    const n = targetChars.length;
    if (n === 0 || slots.length !== n) return;

    const normWord = (s: string) => (parsed.case_sensitive ? s : s.toLowerCase());
    const answers = [item?.target_word ?? "", ...(item?.accepted_words ?? [])].filter(
      (w): w is string => typeof w === "string" && w.length > 0,
    );

    const allFilled = slots.every((s) => s !== null);
    const allLocked = allFilled && slots.every((s) => s!.locked);

    if (allLocked) {
      const built = slots.map((s) => s!.char).join("");
      if (answers.some((a) => normWord(a) === normWord(built))) {
        playSfx("correct", muted);
        onPass();
      }
      return;
    }

    if (!allFilled) {
      playSfx("wrong", muted);
      onWrong();
      return;
    }

    const normC = (c: string) => (parsed.case_sensitive ? c : c.toLowerCase());
    const kickIndices: number[] = [];
    const lockIndices: number[] = [];

    for (let i = 0; i < n; i++) {
      const cell = slots[i];
      if (!cell || cell.locked) continue;
      const expected = targetChars[i] ?? "";
      if (normC(cell.char) === normC(expected)) lockIndices.push(i);
      else kickIndices.push(i);
    }

    if (kickIndices.length === 0) {
      const newSlots: (WordCell | null)[] = slots.map((c) => {
        if (!c) return null;
        if (c.locked) return c;
        return { ...c, locked: true };
      });
      setWordSlots(newSlots);
      const built = newSlots.map((s) => s!.char).join("");
      if (answers.some((a) => normWord(a) === normWord(built))) {
        playSfx("correct", muted);
        onPass();
      }
      return;
    }

    playSfx("wrong", muted);
    onWrong();

    setWordSlots((prev) => {
      const next = [...prev];
      for (const i of lockIndices) {
        const c = next[i];
        if (c && !c.locked) next[i] = { ...c, locked: true };
      }
      return next;
    });

    setShakingSlotIndices(new Set(kickIndices));
    kickTimeoutRef.current = setTimeout(() => {
      kickTimeoutRef.current = null;
      setWordSlots((prev) => {
        const next = [...prev];
        for (const i of kickIndices) {
          next[i] = null;
        }
        return next;
      });
      setShakingSlotIndices(new Set());
    }, 460);
  }

  function choose(ch: string, idx: number) {
    if (passed) return;
    playSfx("tap", muted);
    const traySlotKey = `${idx}__${ch}`;
    if (trayKeyInUse(traySlotKey)) return;

    setWordSlots((prev) => {
      const emptyIdx = prev.findIndex((c) => c === null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = { traySlotKey, char: ch, locked: false };
      const allFilled = next.every((c) => c !== null);
      if (allFilled) {
        queueMicrotask(() => runLetterCheck(next));
      }
      return next;
    });
  }

  function returnToTray(slotIndex: number) {
    if (passed) return;
    const cell = wordSlots[slotIndex];
    if (!cell || cell.locked) return;
    playSfx("tap", muted);
    setWordSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }

  function clear() {
    if (passed) return;
    playSfx("tap", muted);
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
    setShakingSlotIndices(new Set());
    setWordSlots((prev) => prev.map((c) => (c?.locked ? c : null)));
  }

  function check() {
    if (passed) return;
    playSfx("tap", muted);
    runLetterCheck(wordSlots);
  }

  useEffect(
    () => () => {
      if (kickTimeoutRef.current) clearTimeout(kickTimeoutRef.current);
    },
    [],
  );

  const [imageFit, setImageFit] = useState<"cover" | "contain">(() => parsed.image_fit ?? "cover");
  useEffect(() => {
    queueMicrotask(() => {
      setImageFit(parsed.image_fit ?? "cover");
    });
  }, [parsed.image_url, parsed.image_fit]);

  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = wordAudioRef.current;
    const url = parsed.image_audio_url?.trim();
    if (!el) return;
    if (url) {
      el.src = url;
      el.load();
    } else {
      el.removeAttribute("src");
    }
  }, [parsed.image_audio_url]);

  function playPictureWord() {
    if (passed) return;
    playSfx("tap", muted);
    if (parsed.image_use_tts) {
      const line = parsed.image_read_aloud_text?.trim() || targetWord.trim();
      if (line) speakText(line, { muted });
      return;
    }
    const url = parsed.image_audio_url?.trim();
    if (url && !muted) {
      const el = wordAudioRef.current;
      if (el) {
        el.currentTime = 0;
        void el.play().catch(() => null);
        return;
      }
    }
    const say = targetWord.trim();
    if (say) speakText(say, { muted });
  }

  return (
    <div>
      <audio ref={wordAudioRef} preload="metadata" className="hidden" />
      {parsed.image_url ? (
        <div className="mb-4 space-y-2">
          <button
            type="button"
            disabled={passed}
            onClick={playPictureWord}
            className={clsx(
              "group relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink text-left outline-none ring-kid-ink focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
              !passed && "cursor-pointer",
            )}
            aria-label={
              parsed.image_use_tts ?
                `Tap to hear: ${parsed.image_read_aloud_text?.trim() || targetWord || "word"}`
              : parsed.image_audio_url?.trim() ?
                "Tap to hear the word"
              : `Tap to hear the word: ${targetWord || "target word"}`
            }
          >
            <Image
              src={parsed.image_url}
              alt=""
              fill
              className={imageFit === "contain" ? "object-contain bg-white" : "object-cover"}
              unoptimized={unopt(parsed.image_url)}
            />
            {!passed ? (
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border-2 border-kid-ink bg-white/95 px-2.5 py-1 text-xs font-bold text-kid-ink shadow-sm">
                Tap · hear word
              </span>
            ) : null}
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-11 !min-w-0 px-4 text-base"
              onClick={() => {
                playSfx("tap", muted);
                setImageFit((f) => (f === "cover" ? "contain" : "cover"));
              }}
            >
              {imageFit === "cover" ? "Show whole image" : "Fill frame"}
            </KidButton>
          </div>
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        <p className="sr-only">
          Fill each slot left to right. Tap Check or fill every slot to verify letters. Green letters stay; wrong
          letters return to the tray.
        </p>
        <div
          className="mt-3 min-w-0 rounded-xl border-2 border-dashed border-kid-ink bg-kid-surface-muted/40 p-3"
          aria-label="Your word"
        >
          <div className={letterTilesRowClass}>
            {wordSlots.map((cell, slotIndex) => (
              <div
                key={`slot-${slotIndex}`}
                className="flex min-h-[3.25rem] min-w-[1.125rem] flex-[1_1_0] basis-0 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white/60 px-0.5"
              >
                {cell ? (
                  <button
                    type="button"
                    disabled={passed || cell.locked}
                    className={clsx(
                      letterTileClass,
                      cell.locked &&
                        "border-emerald-600 bg-emerald-50 text-emerald-950 kid-feedback-glow-correct hover:bg-emerald-50 !opacity-100",
                      shakingSlotIndices.has(slotIndex) &&
                        "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
                    )}
                    onClick={() => returnToTray(slotIndex)}
                    aria-label={
                      cell.locked ? `Letter ${cell.char} locked` : `Remove ${cell.char} from word`
                    }
                  >
                    {cell.char}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-neutral-400 sm:text-sm" aria-hidden>
                    ·
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-neutral-600">Letter tray — tap to add (first empty slot)</p>
        <div ref={trayRowRef} className={clsx(trayTilesRowClass, "mt-2 min-h-[3.25rem]")}>
          {letters
            .map((ch, i) => ({ ch, i, traySlotKey: `${i}__${ch}` }))
            .filter(({ traySlotKey }) => !trayKeyInUse(traySlotKey))
            .map(({ ch, i, traySlotKey }) => {
              const px = trayTileSizePx ?? 44;
              const fs = Math.min(24, Math.max(14, Math.round(px * 0.42)));
              return (
                <button
                  key={traySlotKey}
                  type="button"
                  disabled={passed}
                  className={trayLetterTileClass}
                  style={{
                    width: px,
                    height: px,
                    minWidth: px,
                    minHeight: px,
                    fontSize: fs,
                  }}
                  onClick={() => choose(ch, i)}
                  aria-label={`Add letter ${ch}`}
                >
                  {ch}
                </button>
              );
            })}
        </div>
        <div className="mt-4 flex gap-2">
          <KidButton type="button" variant="secondary" disabled={passed} onClick={clear}>Clear</KidButton>
          <KidButton
            type="button"
            disabled={passed || wordSlots.length === 0 || wordSlots.every((s) => s === null)}
            onClick={check}
          >
            Check
          </KidButton>
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
