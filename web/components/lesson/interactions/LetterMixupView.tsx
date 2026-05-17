"use client";

import Image from "next/image";
import { clsx } from "clsx";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx, primeAudioOutput } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  VOCAB_STAGE_BACKGROUND,
  vocabLetterSlotClass,
  vocabLetterTileClass,
} from "@/lib/vocabulary-templates/vocab-interaction-ui";
import {
  GuideBlock,
  interactionImageFitClass,
  interactionHeroImageFrameStyle,
  interactionImmersiveStageClass,
  InteractionLessonNav,
  InteractionStageFooter,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
  deterministicShuffle,
} from "./shared";

/** Vocab spell: prefer large tiles; scroll horizontally rather than shrink below `min`. */
function computeVocabSpellTileSizePx(
  rowWidth: number,
  letterCount: number,
  gapPx: number,
): number {
  const preferred = 56;
  const min = 48;
  const max = 72;
  if (letterCount <= 0) return preferred;
  const gaps = Math.max(0, letterCount - 1) * gapPx;
  const fitAll = Math.floor((rowWidth - gaps) / letterCount);
  if (fitAll >= preferred) return Math.min(max, preferred);
  return Math.min(max, Math.max(min, fitAll));
}

/** Centers the tile group; scroll lives on a max-w-full child so short words stay centered. */
function CenteredLetterTileRow({
  measureRef,
  frameClassName,
  className,
  ariaLabel,
  children,
}: {
  measureRef?: RefObject<HTMLDivElement | null>;
  frameClassName?: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={measureRef}
      className={clsx("flex w-full min-w-0 justify-center", className)}
      aria-label={ariaLabel}
    >
      <div
        className={clsx(
          "w-fit max-w-full overflow-x-auto pb-0.5 [scrollbar-width:thin]",
          frameClassName,
        )}
      >
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5">{children}</div>
      </div>
    </div>
  );
}

export function LetterMixupView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
  vocabStageTint = false,
  ttsLang = "en-US",
  submitOnEnter,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "letter_mixup" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
  vocabStageTint?: boolean;
  ttsLang?: string;
  submitOnEnter?: boolean;
} & NavProps) {
  const immersive = controlsPlacement === "stage-footer";
  const vocabImmersive = immersive && vocabStageTint;

  const item = parsed.items[0];
  const targetWord = item?.target_word ?? "";
  const targetChars = useMemo(() => targetWord.split(""), [targetWord]);
  const letters = useMemo(() => {
    const split = targetChars;
    const shuffleSeed =
      typeof parsed.letter_shuffle_seed === "string" && parsed.letter_shuffle_seed.trim()
        ? parsed.letter_shuffle_seed.trim()
        : targetWord;
    return parsed.shuffle_letters ? deterministicShuffle([...split], shuffleSeed) : split;
  }, [parsed.shuffle_letters, parsed.letter_shuffle_seed, targetChars, targetWord]);
  const lettersKey = useMemo(() => letters.map((ch, i) => `${i}:${ch}`).join("|"), [letters]);

  type WordCell = { traySlotKey: string; char: string; locked: boolean };
  const [wordSlots, setWordSlots] = useState<(WordCell | null)[]>([]);
  const wordSlotsRef = useRef<(WordCell | null)[]>([]);
  wordSlotsRef.current = wordSlots;
  const passedRef = useRef(passed);
  passedRef.current = passed;
  const [shakingSlotIndices, setShakingSlotIndices] = useState<Set<number>>(() => new Set());
  const kickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [passing, setPassing] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setWordSlots(Array.from({ length: Math.max(1, targetChars.length) }, () => null));
      setShakingSlotIndices(new Set());
      setPassing(false);
    });
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
  }, [lettersKey, targetChars.length]);

  const letterTileScrollOuterClass =
    "w-full min-w-0 overflow-x-auto pb-0.5 [scrollbar-width:thin]";
  const letterTilesInnerClass = "mx-auto flex w-fit shrink-0 flex-nowrap items-center gap-1.5";
  const letterTileClass = vocabImmersive
    ? vocabLetterTileClass
    : "box-border flex h-full w-full min-h-0 min-w-0 touch-manipulation select-none items-center justify-center overflow-hidden rounded-xl border-2 border-sky-500 bg-white px-0.5 font-bold leading-none text-kid-ink shadow-sm transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

  const TRAY_GAP_PX = vocabImmersive ? 6 : 4;
  const trayLetterTileClass = vocabImmersive
    ? clsx(vocabLetterTileClass, "shrink-0")
    : "box-border flex shrink-0 touch-manipulation select-none items-center justify-center rounded-xl border-2 border-sky-500 bg-white font-bold leading-none text-kid-ink shadow-sm transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

  const letterSlotsRowRef = useRef<HTMLDivElement>(null);
  const [letterTileSizePx, setLetterTileSizePx] = useState<number | null>(null);
  const tileMinPx = vocabImmersive ? 48 : 26;
  const tileMaxPx = vocabImmersive ? 72 : 48;
  const tilePreferredPx = vocabImmersive ? 56 : 44;

  useLayoutEffect(() => {
    const n = letters.length;
    if (n === 0) {
      queueMicrotask(() => setLetterTileSizePx(null));
      return;
    }
    const el = letterSlotsRowRef.current;
    if (!el) return;

    const compute = (): boolean => {
      const w = el.clientWidth;
      if (w <= 0) return false;
      const clamped = vocabImmersive
        ? computeVocabSpellTileSizePx(w, n, TRAY_GAP_PX)
        : (() => {
            const totalGaps = Math.max(0, n - 1) * TRAY_GAP_PX;
            const raw = Math.floor((w - totalGaps) / n);
            return Math.min(tileMaxPx, Math.max(tileMinPx, raw));
          })();
      queueMicrotask(() => {
        setLetterTileSizePx(clamped);
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
  }, [lettersKey, letters.length, TRAY_GAP_PX, tileMaxPx, tileMinPx, vocabImmersive]);

  const pictureListenLine =
    parsed.image_read_aloud_text?.trim() || targetWord.trim();

  const speakWordOnPass = useCallback(async () => {
    const line = pictureListenLine || targetWord.trim();
    if (!line || muted) return;
    await speakTextAndWait(line, { lang: ttsLang, muted });
  }, [muted, pictureListenLine, targetWord, ttsLang]);

  const completePass = useCallback(async () => {
    if (passedRef.current || passing) return;
    setPassing(true);
    if (vocabImmersive) {
      await speakWordOnPass();
    }
    onPass();
    setPassing(false);
  }, [onPass, passing, speakWordOnPass, vocabImmersive]);

  function trayKeyInUse(traySlotKey: string) {
    return wordSlots.some((s) => s?.traySlotKey === traySlotKey);
  }

  const checkRef = useRef<() => void>(() => {});

  function runLetterCheck(slots: (WordCell | null)[]) {
    if (passedRef.current || passing) return;
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
        void completePass();
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
        void completePass();
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
    if (passed || passing) return;
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
    if (passed || passing) return;
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
    if (passed || passing) return;
    playSfx("tap", muted);
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
    setShakingSlotIndices(new Set());
    setWordSlots((prev) => prev.map((c) => (c?.locked ? c : null)));
  }

  function check() {
    if (passedRef.current || passing) return;
    playSfx("tap", muted);
    runLetterCheck(wordSlotsRef.current);
  }
  checkRef.current = check;

  useEffect(
    () => () => {
      if (kickTimeoutRef.current) clearTimeout(kickTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!submitOnEnter) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (passedRef.current || passing) return;
      const slots = wordSlotsRef.current;
      if (slots.length === 0 || slots.every((s) => s === null)) return;
      e.preventDefault();
      checkRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submitOnEnter, passing]);

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

  useEffect(() => {
    if (!immersive || muted || passed || !parsed.image_use_tts || !pictureListenLine) return;
    const timer = window.setTimeout(() => {
      speakText(pictureListenLine, { lang: ttsLang, muted });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    immersive,
    item?.id,
    muted,
    passed,
    parsed.image_use_tts,
    pictureListenLine,
    ttsLang,
  ]);

  const playPictureWord = useCallback(() => {
    if (passed || passing) return;
    primeAudioOutput();
    playSfx("tap", muted);
    if (parsed.image_use_tts) {
      if (pictureListenLine) speakText(pictureListenLine, { lang: ttsLang, muted });
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
    if (say) speakText(say, { lang: ttsLang, muted });
  }, [muted, parsed.image_audio_url, parsed.image_use_tts, passed, passing, pictureListenLine, targetWord, ttsLang]);

  const tilePx = letterTileSizePx ?? (vocabImmersive ? tilePreferredPx : 44);
  const tileFontMax = vocabImmersive ? 36 : 24;
  const tileFontMin = vocabImmersive ? 22 : 14;
  const tileFontScale = vocabImmersive ? 0.52 : 0.42;

  const slotTiles = wordSlots.map((cell, slotIndex) => {
    const fs = Math.min(tileFontMax, Math.max(tileFontMin, Math.round(tilePx * tileFontScale)));
    return (
      <div
        key={`slot-${slotIndex}`}
        className={
          vocabImmersive ?
            vocabLetterSlotClass
          : "flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white/60 p-0.5"
        }
        style={{
          width: tilePx,
          height: tilePx,
          minWidth: tilePx,
          minHeight: tilePx,
        }}
      >
        {cell ?
          <button
            type="button"
            disabled={passed || passing || cell.locked}
            className={clsx(
              letterTileClass,
              cell.locked &&
                "border-emerald-600 bg-emerald-50 text-emerald-950 kid-feedback-glow-correct hover:bg-emerald-50 !opacity-100",
              shakingSlotIndices.has(slotIndex) &&
                "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
            )}
            style={{ fontSize: fs }}
            onClick={() => returnToTray(slotIndex)}
            aria-label={
              cell.locked ? `Letter ${cell.char} locked` : `Remove ${cell.char} from word`
            }
          >
            {cell.char}
          </button>
        : <span className="text-xs font-medium text-neutral-400 sm:text-sm" aria-hidden>·</span>}
      </div>
    );
  });

  const trayTiles = letters
    .map((ch, i) => ({ ch, i, traySlotKey: `${i}__${ch}` }))
    .filter(({ traySlotKey }) => !trayKeyInUse(traySlotKey))
    .map(({ ch, i, traySlotKey }) => {
      const fs = Math.min(tileFontMax, Math.max(tileFontMin, Math.round(tilePx * tileFontScale)));
      return (
        <button
          key={traySlotKey}
          type="button"
          disabled={passed || passing}
          className={trayLetterTileClass}
          style={{
            width: tilePx,
            height: tilePx,
            minWidth: tilePx,
            minHeight: tilePx,
            fontSize: fs,
          }}
          onClick={() => choose(ch, i)}
          aria-label={`Add letter ${ch}`}
        >
          {ch}
        </button>
      );
    });

  const answerRow =
    immersive ?
      <CenteredLetterTileRow
        measureRef={letterSlotsRowRef}
        frameClassName={
          vocabImmersive ?
            "rounded-xl border-2 border-[#152668]/25 bg-white/50 p-3"
          : "rounded-xl border-2 border-dashed border-kid-ink bg-kid-surface-muted/40 p-3"
        }
        ariaLabel="Your word"
      >
        {slotTiles}
      </CenteredLetterTileRow>
    : <div
        className="mt-3 min-w-0 rounded-xl border-2 border-dashed border-kid-ink bg-kid-surface-muted/40 p-3"
        aria-label="Your word"
      >
        <div ref={letterSlotsRowRef} className={letterTileScrollOuterClass}>
          <div className={letterTilesInnerClass}>{slotTiles}</div>
        </div>
      </div>;

  const trayRow =
    immersive ?
      <CenteredLetterTileRow className="mt-3">{trayTiles}</CenteredLetterTileRow>
    : <div className={clsx(letterTileScrollOuterClass, "mt-2 min-h-[3.25rem]")}>
        <div className={letterTilesInnerClass}>{trayTiles}</div>
      </div>;

  const actionButtons = (
    <div className={clsx("flex w-full gap-2", immersive ? "justify-center" : "")}>
      <KidButton type="button" variant="secondary" disabled={passed || passing} onClick={clear}>
        Clear
      </KidButton>
      <KidButton
        type="button"
        disabled={passed || passing || wordSlots.length === 0 || wordSlots.every((s) => s === null)}
        onClick={check}
        className={immersive ? "!min-h-12 !px-6 !text-lg sm:!text-xl" : undefined}
      >
        Check
      </KidButton>
    </div>
  );

  const promptBlock = (
    <p
      className={clsx(
        "font-semibold text-kid-ink",
        immersive ? "text-center text-2xl sm:text-3xl" : "text-xl",
      )}
    >
      {parsed.prompt}
    </p>
  );

  if (immersive) {
    return (
      <div
        className={clsx(
          interactionImmersiveStageClass,
          vocabStageTint && "rounded-lg px-2 py-2 sm:px-3",
        )}
        style={vocabStageTint ? { backgroundColor: VOCAB_STAGE_BACKGROUND } : undefined}
      >
        <audio ref={wordAudioRef} preload="metadata" className="hidden" />
        <div className="flex min-h-0 flex-1 flex-col items-center gap-3">
          {parsed.image_url ?
            <button
              type="button"
              disabled={passed || passing}
              onClick={playPictureWord}
              className={clsx(
                "relative mx-auto w-full max-w-md shrink-0 overflow-hidden rounded-lg border-4 border-kid-ink outline-none ring-kid-ink focus-visible:ring-4",
                !passed && parsed.image_use_tts && pictureListenLine && "cursor-pointer",
              )}
              style={{
                aspectRatio: "16 / 10",
                maxHeight: "min(32dvh, calc((100vw - 3rem) * 10 / 16))",
              }}
              aria-label={
                parsed.image_use_tts && pictureListenLine ?
                  `Tap to hear: ${pictureListenLine}`
                : "Picture"
              }
            >
              <Image
                src={parsed.image_url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 28rem"
                className={interactionImageFitClass(parsed.image_fit)}
                unoptimized={unopt(parsed.image_url)}
              />
              {!passed && parsed.image_use_tts && pictureListenLine ?
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border-2 border-kid-ink bg-white/95 px-2.5 py-1 text-xs font-bold text-kid-ink shadow-sm">
                  Tap · hear word
                </span>
              : null}
            </button>
          : null}
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-1">
            <div className="w-full text-center">{promptBlock}</div>
            <p className="sr-only">
              Fill each slot left to right. Tap Check or fill every slot to verify letters. Green letters
              stay; wrong letters return to the tray.
            </p>
            <div className="flex w-full flex-col items-center gap-3">
              {answerRow}
              {trayRow}
            </div>
            {actionButtons}
          </div>
        </div>
        <InteractionStageFooter showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
      </div>
    );
  }

  return (
    <div className={interactionNavReservePaddingClass}>
      <audio ref={wordAudioRef} preload="metadata" className="hidden" />
      {parsed.image_url ?
        <div className="mb-4">
          <button
            type="button"
            disabled={passed || passing}
            onClick={playPictureWord}
            className={clsx(
              "group relative w-full overflow-hidden rounded-lg border-4 border-kid-ink text-left outline-none ring-kid-ink focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
              !passed && "cursor-pointer",
            )}
            style={interactionHeroImageFrameStyle}
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
              className={interactionImageFitClass("contain")}
              unoptimized={unopt(parsed.image_url)}
            />
            {!passed ?
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border-2 border-kid-ink bg-white/95 px-2.5 py-1 text-xs font-bold text-kid-ink shadow-sm">
                Tap · hear word
              </span>
            : null}
          </button>
        </div>
      : null}
      <KidPanel>
        {promptBlock}
        <p className="sr-only">
          Fill each slot left to right. Tap Check or fill every slot to verify letters. Green letters stay;
          wrong letters return to the tray.
        </p>
        {answerRow}
        <p className="mt-2 text-center text-sm text-neutral-600">
          Letter tray — tap to add (first empty slot)
        </p>
        {trayRow}
        <div className="mt-4">{actionButtons}</div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}

