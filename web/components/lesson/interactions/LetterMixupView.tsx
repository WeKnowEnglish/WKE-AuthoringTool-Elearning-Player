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
  type ReactNode,
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
  buildInitialLetterMixupSlots,
  buildLetterMixupLayout,
  letterMixupAnswerRowRanges,
  maxLetterMixupWordLength,
  normalizeLetterMixupTarget,
} from "@/lib/games-letter-mixup/letter-mixup-layout";
import {
  GuideBlock,
  interactionHeroImageFrameClass,
  interactionHeroImageFrameStyle,
  interactionImageFitClass,
  interactionImmersiveStageClass,
  InteractionLessonNav,
  InteractionStageFooter,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

/**
 * Size tiles to fit one word row in the letter column.
 * Prefer large tiles; shrink for long words rather than forcing horizontal scroll.
 */
function computeLetterTileSizePx(
  rowWidth: number,
  letterCount: number,
  gapPx: number,
  options: { preferred: number; min: number; max: number },
): number {
  const { preferred, min, max } = options;
  if (letterCount <= 0) return preferred;
  const gaps = Math.max(0, letterCount - 1) * gapPx;
  const fitAll = Math.floor((rowWidth - gaps) / letterCount);
  if (fitAll >= preferred) return Math.min(max, preferred);
  return Math.min(max, Math.max(min, fitAll));
}

/** Centers a single word’s tiles; parent sizes tiles so the row fits without scrolling. */
function LetterWordRow({
  className,
  ariaLabel,
  children,
}: {
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex w-full min-w-0 flex-nowrap items-center justify-center gap-1.5",
        className,
      )}
      aria-label={ariaLabel}
    >
      {children}
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
  embeddedMode = false,
  suppressWrongCallback = false,
  deadlineSec,
  onDeadline,
  exploreCloudLayout = false,
  spellSprintMode = false,
  onWordComplete,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "letter_mixup" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
  vocabStageTint?: boolean;
  ttsLang?: string;
  submitOnEnter?: boolean;
  /** Explore gate: compact layout, no lesson nav. */
  embeddedMode?: boolean;
  /** Explore gate: wrong letter kicks play SFX only. */
  suppressWrongCallback?: boolean;
  deadlineSec?: number;
  onDeadline?: () => void;
  /** Explore: letters as clouds in the sky over the run loop. */
  exploreCloudLayout?: boolean;
  /** Explore sprint: each correct word fires onWordComplete; timer owned by parent. */
  spellSprintMode?: boolean;
  onWordComplete?: () => void;
} & NavProps) {
  const immersive = embeddedMode || controlsPlacement === "stage-footer";
  const vocabImmersive = immersive && vocabStageTint;
  const vocabImgOpts = vocabStageTint ? { vocabStage: true as const } : undefined;

  const item = parsed.items[0];
  const targetWord = item?.target_word ?? "";
  const layout = useMemo(() => {
    const shuffleSeed =
      typeof parsed.letter_shuffle_seed === "string" && parsed.letter_shuffle_seed.trim()
        ? parsed.letter_shuffle_seed.trim()
        : targetWord;
    return buildLetterMixupLayout(targetWord, {
      shuffleLetters: parsed.shuffle_letters,
      shuffleSeed,
    });
  }, [parsed.shuffle_letters, parsed.letter_shuffle_seed, targetWord]);
  const { targetChars, trayGroups, trayLetters: letters } = layout;
  const answerRowRanges = useMemo(
    () => letterMixupAnswerRowRanges(targetChars),
    [targetChars],
  );
  const sizingLetterCount = useMemo(
    () => maxLetterMixupWordLength(trayGroups),
    [trayGroups],
  );
  const lettersKey = useMemo(
    () =>
      `${targetChars.map((ch, i) => `${i}:${ch}`).join("|")}||${letters
        .map((ch, i) => `${i}:${ch}`)
        .join("|")}`,
    [targetChars, letters],
  );

  type WordCell = { traySlotKey: string; char: string; locked: boolean };
  const [wordSlots, setWordSlots] = useState<(WordCell | null)[]>([]);
  const wordSlotsRef = useRef<(WordCell | null)[]>([]);
  wordSlotsRef.current = wordSlots;
  const passedRef = useRef(passed);
  passedRef.current = passed;
  const deadlineFiredRef = useRef(false);
  /** Blocks duplicate onPass while TTS runs or before parent re-renders with passed=true. */
  const passCommittedRef = useRef(false);

  useEffect(() => {
    deadlineFiredRef.current = false;
  }, [deadlineSec, parsed.items[0]?.id]);

  useEffect(() => {
    if (spellSprintMode) return;
    if (!deadlineSec || deadlineSec <= 0 || !onDeadline || passed) return;
    const deadlineMs = deadlineSec * 1000;
    const started = Date.now();
    const id = window.setInterval(() => {
      if (passedRef.current || passCommittedRef.current) return;
      if (Date.now() - started >= deadlineMs) {
        if (!deadlineFiredRef.current) {
          deadlineFiredRef.current = true;
          onDeadline();
        }
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [deadlineSec, onDeadline, passed, parsed.items[0]?.id, spellSprintMode]);
  const [shakingSlotIndices, setShakingSlotIndices] = useState<Set<number>>(() => new Set());
  const kickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [passing, setPassing] = useState(false);

  useEffect(() => {
    if (!passed) passCommittedRef.current = false;
  }, [passed]);

  useEffect(() => {
    queueMicrotask(() => {
      const initial = buildInitialLetterMixupSlots(targetChars);
      setWordSlots(initial.length > 0 ? initial : [null]);
      setShakingSlotIndices(new Set());
      setPassing(false);
      passCommittedRef.current = false;
    });
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
  }, [lettersKey, targetChars]);

  const exploreCloud =
    exploreCloudLayout && embeddedMode;
  const cloudLetterClass =
    "flex shrink-0 items-center justify-center rounded-full border-2 border-white/95 bg-white/90 font-extrabold text-sky-900 shadow-[0_4px_12px_rgba(14,116,144,0.25)] transition-transform hover:scale-105 active:scale-95";
  const cloudSlotClass =
    "flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-white/50 p-0.5 shadow-sm";

  const letterTileClass = vocabImmersive
    ? vocabLetterTileClass
    : "box-border flex h-full w-full min-h-0 min-w-0 touch-manipulation select-none items-center justify-center overflow-hidden rounded-xl border-2 border-sky-500 bg-white px-0.5 font-bold leading-none text-kid-ink shadow-sm transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

  const TRAY_GAP_PX = vocabImmersive ? 6 : 4;
  const trayLetterTileClass = vocabImmersive
    ? clsx(vocabLetterTileClass, "shrink-0")
    : "box-border flex shrink-0 touch-manipulation select-none items-center justify-center rounded-xl border-2 border-sky-500 bg-white font-bold leading-none text-kid-ink shadow-sm transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100";

  /** Measure width of the letter column (answer area), not a single scrolled row. */
  const letterColumnMeasureRef = useRef<HTMLDivElement>(null);
  const [letterTileSizePx, setLetterTileSizePx] = useState<number | null>(null);
  // Allow smaller tiles so long words fit the 2/3 letter column without scrolling.
  const tileMinPx = vocabImmersive ? 28 : 22;
  const tileMaxPx = vocabImmersive ? 72 : 48;
  const tilePreferredPx = vocabImmersive ? 56 : 44;

  useLayoutEffect(() => {
    const n = sizingLetterCount;
    if (n <= 0) {
      queueMicrotask(() => setLetterTileSizePx(null));
      return;
    }
    const el = letterColumnMeasureRef.current;
    if (!el) return;

    const compute = (): boolean => {
      const w = el.clientWidth;
      if (w <= 0) return false;
      const clamped = computeLetterTileSizePx(w, n, TRAY_GAP_PX, {
        preferred: tilePreferredPx,
        min: tileMinPx,
        max: tileMaxPx,
      });
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
  }, [
    lettersKey,
    sizingLetterCount,
    TRAY_GAP_PX,
    tileMaxPx,
    tileMinPx,
    tilePreferredPx,
  ]);

  const pictureListenLine =
    parsed.image_read_aloud_text?.trim() || targetWord.trim();

  const speakWordOnPass = useCallback(async () => {
    const line = pictureListenLine || targetWord.trim();
    if (!line || muted) return;
    await speakTextAndWait(line, { lang: ttsLang, muted });
  }, [muted, pictureListenLine, targetWord, ttsLang]);

  const completePass = useCallback(async () => {
    if (passedRef.current || passCommittedRef.current) return;
    passCommittedRef.current = true;
    setPassing(true);
    try {
      if (spellSprintMode && onWordComplete) {
        onWordComplete();
        passCommittedRef.current = false;
        return;
      }
      if (vocabImmersive) {
        await speakWordOnPass();
      }
      onPass();
    } finally {
      setPassing(false);
    }
  }, [onPass, onWordComplete, speakWordOnPass, spellSprintMode, vocabImmersive]);

  function trayKeyInUse(traySlotKey: string) {
    return wordSlots.some((s) => s?.traySlotKey === traySlotKey);
  }

  const checkRef = useRef<() => void>(() => {});

  function runLetterCheck(slots: (WordCell | null)[]) {
    if (passedRef.current || passCommittedRef.current || passing) return;
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
    const n = targetChars.length;
    if (n === 0 || slots.length !== n) return;

    const normWord = (s: string) => {
      const normalized = normalizeLetterMixupTarget(s);
      return parsed.case_sensitive ? normalized : normalized.toLowerCase();
    };
    const answers = [
      targetChars.join(""),
      ...(item?.accepted_words ?? []).map((word) => normalizeLetterMixupTarget(word)),
    ].filter((w): w is string => typeof w === "string" && w.length > 0);

    const allFilled = slots.every((s) => s !== null);
    const allLocked = allFilled && slots.every((s) => s!.locked);

    if (allLocked) {
      const built = slots.map((s) => s!.char).join("");
      if (answers.some((a) => normWord(a) === normWord(built))) {
        void completePass();
      }
      return;
    }

    if (!allFilled) {
      playSfx("wrong", muted);
      if (!suppressWrongCallback) onWrong();
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
        void completePass();
      }
      return;
    }

    playSfx("wrong", muted);
    if (!suppressWrongCallback) onWrong();

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
    if (passed || passing || passCommittedRef.current) return;
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
    if (passed || passing || passCommittedRef.current) return;
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
    if (passed || passing || passCommittedRef.current) return;
    playSfx("tap", muted);
    if (kickTimeoutRef.current) {
      clearTimeout(kickTimeoutRef.current);
      kickTimeoutRef.current = null;
    }
    setShakingSlotIndices(new Set());
    // Keep locked letters and fixed space slots; clear only unlocked letter tiles.
    setWordSlots((prev) => prev.map((c) => (c?.locked ? c : null)));
  }

  function check() {
    if (passedRef.current || passCommittedRef.current || passing) return;
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
      if (
        slots.length === 0 ||
        !slots.some((s) => s !== null && !s.traySlotKey.startsWith("space__"))
      ) {
        return;
      }
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
    if (!immersive || muted || passed) return;
    const url = parsed.image_audio_url?.trim();
    const timer = window.setTimeout(() => {
      // Recorded audio wins over TTS (same as Listen / Flashcards).
      if (url) {
        const el = wordAudioRef.current;
        if (el) {
          el.currentTime = 0;
          void el.play().catch(() => null);
        }
        return;
      }
      if (parsed.image_use_tts && pictureListenLine) {
        speakText(pictureListenLine, { lang: ttsLang, muted });
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    immersive,
    item?.id,
    muted,
    passed,
    parsed.image_audio_url,
    parsed.image_use_tts,
    pictureListenLine,
    ttsLang,
  ]);

  const playPictureWord = useCallback(() => {
    if (passed || passing) return;
    primeAudioOutput();
    playSfx("tap", muted);
    const url = parsed.image_audio_url?.trim();
    // Prefer recorded / uploaded clip whenever present.
    if (url && !muted) {
      const el = wordAudioRef.current;
      if (el) {
        el.currentTime = 0;
        void el.play().catch(() => null);
        return;
      }
    }
    if (parsed.image_use_tts && pictureListenLine) {
      speakText(pictureListenLine, { lang: ttsLang, muted });
      return;
    }
    const say = targetWord.trim();
    if (say) speakText(say, { lang: ttsLang, muted });
  }, [muted, parsed.image_audio_url, parsed.image_use_tts, passed, passing, pictureListenLine, targetWord, ttsLang]);

  const tilePx = letterTileSizePx ?? (vocabImmersive ? tilePreferredPx : 44);
  const tileFontMax = vocabImmersive ? 36 : 24;
  const tileFontMin = vocabImmersive ? 16 : 12;
  const tileFontScale = vocabImmersive ? 0.52 : 0.42;

  const renderSlotTile = (slotIndex: number) => {
    const cell = wordSlots[slotIndex];
    const fs = Math.min(tileFontMax, Math.max(tileFontMin, Math.round(tilePx * tileFontScale)));
    return (
      <div
        key={`slot-${slotIndex}`}
        className={
          exploreCloud ? cloudSlotClass
          : vocabImmersive ?
            vocabLetterSlotClass
          : "flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-kid-ink/30 bg-white/60 p-0.5"
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
              exploreCloud ? cloudLetterClass : letterTileClass,
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
        : <span className="text-xs font-medium text-kid-ink/40 sm:text-sm" aria-hidden>·</span>}
      </div>
    );
  };

  const answerWordRows = answerRowRanges.map((range, rowIndex) => (
    <LetterWordRow
      key={`answer-row-${rowIndex}`}
      ariaLabel={answerRowRanges.length > 1 ? `Word ${rowIndex + 1}` : "Your word"}
    >
      {Array.from({ length: range.end - range.start }, (_, offset) =>
        renderSlotTile(range.start + offset),
      )}
    </LetterWordRow>
  ));

  let trayLetterOffset = 0;
  const trayWordRows = trayGroups.map((group, groupIndex) => {
    const groupButtons: ReactNode[] = [];
    for (const ch of group) {
      const i = trayLetterOffset;
      trayLetterOffset += 1;
      const traySlotKey = `${i}__${ch}`;
      if (trayKeyInUse(traySlotKey)) continue;
      const fs = Math.min(tileFontMax, Math.max(tileFontMin, Math.round(tilePx * tileFontScale)));
      groupButtons.push(
        <button
          key={traySlotKey}
          type="button"
          disabled={passed || passing}
          className={exploreCloud ? cloudLetterClass : trayLetterTileClass}
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
        </button>,
      );
    }
    return (
      <LetterWordRow
        key={`tray-row-${groupIndex}`}
        ariaLabel={
          trayGroups.length > 1 ? `Letter tray word ${groupIndex + 1}` : "Letter tray"
        }
      >
        {groupButtons}
      </LetterWordRow>
    );
  });

  const answerFrameClass = exploreCloud
    ? "rounded-2xl border-2 border-white/40 bg-white/10 p-2 backdrop-blur-[2px]"
    : vocabImmersive
      ? "rounded-xl border-2 border-[#152668]/25 bg-white/50 p-3"
      : "rounded-xl border-2 border-dashed border-kid-ink bg-kid-surface-muted/40 p-3";

  const answerRow = (
    <div
      className={clsx(answerFrameClass, !immersive && "mt-3")}
      aria-label="Your word"
    >
      <div
        ref={letterColumnMeasureRef}
        className="flex w-full min-w-0 flex-col items-center gap-2"
      >
        {answerWordRows}
      </div>
    </div>
  );

  const trayRow = (
    <div
      className={clsx(
        "flex w-full min-w-0 flex-col items-center gap-2",
        immersive ? "mt-3" : "mt-2 min-h-[3.25rem]",
      )}
    >
      {trayWordRows}
    </div>
  );

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
        immersive ? "text-center text-2xl sm:text-3xl" : "mb-4 text-xl",
      )}
    >
      {parsed.prompt}
    </p>
  );

  if (immersive) {
    if (exploreCloud) {
      return (
        <div className="flex w-full flex-col items-center gap-3 px-2 pt-[6%]">
          <audio ref={wordAudioRef} preload="metadata" className="hidden" />
          <p className="text-center text-lg font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] sm:text-xl">
            {parsed.prompt}
          </p>
          <p className="sr-only">
            Tap cloud letters to spell the word before time runs out.
          </p>
          <div className="flex w-full max-w-lg flex-col items-center gap-3">
            {answerRow}
            {trayRow}
          </div>
          <div className="mt-1 flex gap-2">{actionButtons}</div>
        </div>
      );
    }

    return (
      <div
        className={clsx(
          interactionImmersiveStageClass,
          vocabStageTint && "rounded-lg px-2 py-2 sm:px-3",
        )}
        style={vocabStageTint ? { backgroundColor: VOCAB_STAGE_BACKGROUND } : undefined}
      >
        <audio ref={wordAudioRef} preload="metadata" className="hidden" />
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
          {parsed.image_url ?
            <div className="flex w-full shrink-0 items-center justify-center md:w-[33%] md:max-w-[33%]">
              <button
                type="button"
                disabled={passed || passing}
                onClick={playPictureWord}
                className={clsx(
                  "relative h-full w-full max-h-[40dvh] overflow-hidden rounded-lg border-4 border-kid-ink outline-none ring-kid-ink focus-visible:ring-4 md:max-h-none",
                  interactionHeroImageFrameClass(vocabImgOpts),
                  !passed &&
                    (Boolean(parsed.image_audio_url?.trim()) ||
                      (parsed.image_use_tts && pictureListenLine)) &&
                    "cursor-pointer",
                )}
                style={{
                  aspectRatio: "4 / 5",
                  minHeight: "min(28dvh, 12rem)",
                  ...interactionHeroImageFrameStyle(vocabImgOpts),
                }}
                aria-label={
                  parsed.image_audio_url?.trim() ?
                    "Tap to hear the word"
                  : parsed.image_use_tts && pictureListenLine ?
                    `Tap to hear: ${pictureListenLine}`
                  : "Picture"
                }
              >
                <Image
                  src={parsed.image_url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className={interactionImageFitClass(parsed.image_fit, vocabImgOpts)}
                  unoptimized={unopt(parsed.image_url)}
                />
                {!passed &&
                (Boolean(parsed.image_audio_url?.trim()) ||
                  (parsed.image_use_tts && pictureListenLine)) ?
                  <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border-2 border-kid-ink bg-white/95 px-2.5 py-1 text-xs font-bold text-kid-ink shadow-sm">
                    Tap · hear word
                  </span>
                : null}
              </button>
            </div>
          : null}
          <div
            className={clsx(
              "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 px-1",
              parsed.image_url ? "md:w-[67%]" : "w-full",
            )}
          >
            <div className="w-full text-center">{promptBlock}</div>
            <p className="sr-only">
              Fill each slot left to right. Phrases break into one row per word. Tap Check or fill
              every slot to verify letters. Green letters stay; wrong letters return to the tray.
            </p>
            <div className="flex w-full max-w-none flex-col items-center gap-3">
              {answerRow}
              {trayRow}
            </div>
            {actionButtons}
          </div>
        </div>
        {embeddedMode ? null : (
          <InteractionStageFooter showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
        )}
      </div>
    );
  }

  return (
    <div className={interactionNavReservePaddingClass}>
      <audio ref={wordAudioRef} preload="metadata" className="hidden" />
      {parsed.image_url ? (
        <div
          className={clsx(
            "flex min-h-0 w-full flex-col gap-3",
            "sm:flex-row sm:items-stretch sm:gap-4",
            vocabStageTint && "rounded-lg px-1 py-1 sm:px-2",
          )}
          style={vocabStageTint ? { backgroundColor: VOCAB_STAGE_BACKGROUND } : undefined}
        >
          <div className="flex w-full shrink-0 items-center justify-center sm:w-[36%] sm:max-w-[14rem]">
            <button
              type="button"
              disabled={passed || passing}
              onClick={playPictureWord}
              className={clsx(
                "relative w-full overflow-hidden rounded-lg border-4 border-kid-ink text-left outline-none ring-kid-ink focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
                interactionHeroImageFrameClass(vocabImgOpts),
                !passed && "cursor-pointer",
              )}
              style={{
                aspectRatio: "4 / 5",
                maxHeight: "min(42dvh, 16rem)",
                ...interactionHeroImageFrameStyle(vocabImgOpts),
              }}
              aria-label={
                parsed.image_audio_url?.trim()
                  ? "Tap to hear the word"
                  : parsed.image_use_tts
                    ? `Tap to hear: ${parsed.image_read_aloud_text?.trim() || targetWord || "word"}`
                    : `Tap to hear the word: ${targetWord || "target word"}`
              }
            >
              <Image
                src={parsed.image_url}
                alt=""
                fill
                className={interactionImageFitClass("contain", vocabImgOpts)}
                unoptimized={unopt(parsed.image_url)}
              />
              {!passed ? (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border-2 border-kid-ink bg-white/95 px-2.5 py-1 text-xs font-bold text-kid-ink shadow-sm">
                  Tap · hear word
                </span>
              ) : null}
            </button>
          </div>
          <KidPanel className="min-w-0 flex-1">
            {promptBlock}
            <p className="sr-only">
              Fill each slot left to right. Tap Check or fill every slot to verify letters. Green
              letters stay; wrong letters return to the tray.
            </p>
            {answerRow}
            <p className="mt-2 text-center text-sm font-semibold text-kid-ink/70">
              Letter tray — tap to add (first empty slot)
            </p>
            {trayRow}
            <div className="mt-4">{actionButtons}</div>
          </KidPanel>
        </div>
      ) : (
        <KidPanel>
          {promptBlock}
          <p className="sr-only">
            Fill each slot left to right. Tap Check or fill every slot to verify letters. Green
            letters stay; wrong letters return to the tray.
          </p>
          {answerRow}
          <p className="mt-2 text-center text-sm font-semibold text-kid-ink/70">
            Letter tray — tap to add (first empty slot)
          </p>
          {trayRow}
          <div className="mt-4">{actionButtons}</div>
        </KidPanel>
      )}
      {embeddedMode ? null : <GuideBlock guide={parsed.guide} />}
      {embeddedMode ? null : (
        <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
      )}
    </div>
  );
}

