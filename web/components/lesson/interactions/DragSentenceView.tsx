"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HomeworkHelpHintCard,
  HomeworkHelpTrigger,
} from "@/components/homework-help/HomeworkHelpCoach";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  advanceDragSentenceHelp,
  applyDragSentenceReveal,
  applyDragSentenceScaffold,
  buildDragSentenceBankTiles,
  emptyHelpStruggle,
  evaluateDragSentenceCheck,
  getDragSentenceHelpStep,
  recordDragSentenceWrongCheck,
  type DragSentenceSlotCell,
  type DragSentenceTile,
  type HelpAction,
  type HelpStruggle,
} from "@/lib/homework-help";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  gamesBodyTextClass,
  gamesCheckActionRowClass,
  gamesChipButtonClass,
  gamesHeroImageFrameClass,
  gamesHintTextClass,
  gamesWrongHintClass,
  interactionHeroImageHeightStyle,
  interactionImageFitClass,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  NavProps,
  unopt,
} from "./shared";

const KICK_MS = 480;

function emptySlots(count: number): (DragSentenceSlotCell | null)[] {
  return Array.from({ length: count }, () => null);
}

export function DragSentenceView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_sentence" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const slotCount = parsed.correct_order.length;
  const puzzleKey = useMemo(
    () =>
      `${parsed.correct_order.join("\u0001")}::${parsed.word_bank.join("\u0001")}`,
    [parsed.correct_order, parsed.word_bank],
  );

  const [slots, setSlots] = useState<(DragSentenceSlotCell | null)[]>(() =>
    emptySlots(slotCount),
  );
  const [bank, setBank] = useState<DragSentenceTile[]>(() =>
    buildDragSentenceBankTiles(parsed.word_bank),
  );
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const [kicking, setKicking] = useState<Set<number>>(() => new Set());
  const [struggle, setStruggle] = useState<HelpStruggle>(emptyHelpStruggle);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helped, setHelped] = useState(false);
  const kickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const parsedRef = useRef(parsed);
  parsedRef.current = parsed;
  const filledCountRef = useRef(0);

  // Only reset when the puzzle content changes — not when parent re-renders
  // with a fresh word_bank array reference (e.g. after Check → onWrong).
  useEffect(() => {
    const current = parsedRef.current;
    if (kickTimerRef.current) {
      clearTimeout(kickTimerRef.current);
      kickTimerRef.current = null;
    }
    setSlots(emptySlots(current.correct_order.length));
    setBank(buildDragSentenceBankTiles(current.word_bank));
    setWrongHint(null);
    setKicking(new Set());
    setStruggle(emptyHelpStruggle());
    setHelpOpen(false);
    setHelped(false);
    filledCountRef.current = 0;
  }, [puzzleKey]);

  useEffect(() => {
    return () => {
      if (kickTimerRef.current) clearTimeout(kickTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const filledCount = slots.reduce((n, cell) => (cell ? n + 1 : n), 0);
    if (filledCount <= filledCountRef.current) {
      filledCountRef.current = filledCount;
      return;
    }
    filledCountRef.current = filledCount;
    const el = stageRef.current;
    if (!el) return;
    let lastFilled = -1;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i]) lastFilled = i;
    }
    if (lastFilled < 0) return;
    const button = el.querySelector<HTMLElement>(`[data-slot-index="${lastFilled}"]`);
    button?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [slots]);

  const helpStep = getDragSentenceHelpStep({
    correctOrder: parsed.correct_order,
    slots,
    struggle,
    instructions: parsed.body_text,
  });

  function clearKickTimer() {
    if (kickTimerRef.current) {
      clearTimeout(kickTimerRef.current);
      kickTimerRef.current = null;
    }
  }

  function addWord(tile: DragSentenceTile) {
    if (passed || kicking.size > 0) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);

    setSlots((prev) => {
      const emptyIdx = prev.findIndex((cell) => cell === null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = { ...tile, locked: false };
      return next;
    });
    setBank((prev) => prev.filter((row) => row.id !== tile.id));
  }

  function clearSlot(index: number) {
    if (passed || kicking.size > 0) return;
    const cell = slots[index];
    if (!cell || cell.locked) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setBank((prev) => [...prev, { id: cell.id, text: cell.text }]);
  }

  function clearUnlocked() {
    if (passed || kicking.size > 0) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setHelpOpen(false);
    const returned: DragSentenceTile[] = [];
    const nextSlots = slots.map((cell) => {
      if (!cell || cell.locked) return cell;
      returned.push({ id: cell.id, text: cell.text });
      return null;
    });
    setSlots(nextSlots);
    if (returned.length > 0) {
      setBank((bankPrev) => [...bankPrev, ...returned]);
    }
  }

  function finishPass() {
    setWrongHint(null);
    setHelpOpen(false);
    onPass();
  }

  function check() {
    if (passed || kicking.size > 0) return;
    playSfx("tap", muted);
    clearKickTimer();

    const result = evaluateDragSentenceCheck(slots, parsed.correct_order);

    if (result.allCorrect) {
      setSlots((prev) =>
        prev.map((cell) => (cell ? { ...cell, locked: true } : cell)),
      );
      finishPass();
      return;
    }

    const nextStruggle = recordDragSentenceWrongCheck(struggle);
    setStruggle(nextStruggle);
    onWrong();

    if (result.lockIndices.length > 0) {
      setSlots((prev) => {
        const next = [...prev];
        for (const i of result.lockIndices) {
          const cell = next[i];
          if (cell && !cell.locked) next[i] = { ...cell, locked: true };
        }
        return next;
      });
    }

    if (result.kickIndices.length === 0) {
      setWrongHint("Not quite yet. Fill every gap, then tap Check again.");
      setHelpOpen(true);
      return;
    }

    setKicking(new Set(result.kickIndices));
    setWrongHint(
      result.lockIndices.length > 0 || slots.some((c) => c?.locked)
        ? "Green words stay. Red words go back to the box — try again."
        : "Not quite yet. Red words go back to the box — try a new order.",
    );
    setHelpOpen(true);

    const kickIndices = [...result.kickIndices];
    const toReturn: DragSentenceTile[] = kickIndices
      .map((i) => slots[i])
      .filter((cell): cell is DragSentenceSlotCell => cell != null && !cell.locked)
      .map((cell) => ({ id: cell.id, text: cell.text }));

    kickTimerRef.current = setTimeout(() => {
      kickTimerRef.current = null;
      setSlots((prev) => {
        const next = [...prev];
        for (const i of kickIndices) {
          const cell = next[i];
          if (cell && !cell.locked) next[i] = null;
        }
        return next;
      });
      if (toReturn.length > 0) {
        setBank((bankPrev) => [...bankPrev, ...toReturn]);
      }
      setKicking(new Set());
    }, KICK_MS);
  }

  function onHelpAction(action: HelpAction) {
    if (action === "got_it") {
      setHelpOpen(false);
      return;
    }
    if (action === "need_more_help") {
      setStruggle((prev) => advanceDragSentenceHelp(prev));
      return;
    }
    if (action === "show_answer") {
      clearKickTimer();
      setKicking(new Set());
      const revealed = applyDragSentenceReveal({
        slots,
        bank,
        correctOrder: parsed.correct_order,
      });
      setSlots(revealed.slots);
      setBank(revealed.bank);
      setHelped(true);
      setWrongHint(null);
      setHelpOpen(false);
      finishPass();
    }
  }

  function applyScaffoldFromHelp() {
    if (passed || kicking.size > 0) return;
    const applied = applyDragSentenceScaffold({
      slots,
      bank,
      correctOrder: parsed.correct_order,
    });
    if (!applied) return;
    playSfx("tap", muted);
    setSlots(applied.slots);
    setBank(applied.bank);
    setHelped(true);
    setWrongHint("I locked the next word in green. Keep going!");
  }

  // When scaffold tip is visible, offer one-tap place for younger students.
  const canPlaceScaffoldHint =
    !passed &&
    kicking.size === 0 &&
    helpOpen &&
    helpStep.level === "scaffold" &&
    helpStep.tip;

  const filledUnlockedCount = slots.filter((c) => c && !c.locked).length;

  return (
    <div className={interactionNavReservePaddingClass}>
      {parsed.image_url ? (
        <div className={gamesHeroImageFrameClass} style={interactionHeroImageHeightStyle}>
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        {parsed.body_text ? <p className={gamesBodyTextClass}>{parsed.body_text}</p> : null}
        <p className={gamesHintTextClass}>
          Tap words to build the sentence
          {slotCount > 6 ? " · long sentence — chips wrap; numbers show order" : ""}
        </p>

        <div
          ref={stageRef}
          className="max-h-[min(40dvh,18rem)] overflow-x-auto overflow-y-auto overscroll-contain rounded-lg border-4 border-kid-ink bg-kid-surface-muted/30 p-3 [-webkit-overflow-scrolling:touch]"
          role="list"
          aria-label="Sentence staging area"
        >
          <div className="flex min-h-14 flex-wrap content-start gap-2">
            {slots.map((cell, i) => {
              const isKicking = kicking.has(i);
              const locked = Boolean(cell?.locked);
              return (
                <button
                  key={`slot-${i}`}
                  data-slot-index={i}
                  type="button"
                  role="listitem"
                  disabled={passed || locked || !cell || kicking.size > 0}
                  onClick={() => clearSlot(i)}
                  aria-label={
                    cell
                      ? locked
                        ? `Locked word ${i + 1}: ${cell.text}`
                        : `Remove word ${i + 1}: ${cell.text}`
                      : `Empty spot ${i + 1}`
                  }
                  className={clsx(
                    "relative min-h-11 max-w-full shrink-0 rounded-lg border-2 px-3 py-2 text-center text-base font-bold transition",
                    cell?.text.includes(" ") ? "min-w-[6.5rem]" : "min-w-[3.25rem]",
                    locked &&
                      "border-emerald-700 bg-emerald-100 text-emerald-950 kid-feedback-glow-correct",
                    isKicking &&
                      "kid-animate-shake border-rose-700 bg-rose-100 text-rose-950",
                    !locked &&
                      !isKicking &&
                      cell &&
                      "border-kid-ink bg-white text-kid-ink hover:bg-kid-surface-muted active:bg-kid-panel",
                    !cell && "border-dashed border-kid-ink/50 bg-white/70 text-kid-ink/40",
                    "disabled:opacity-90",
                  )}
                >
                  <span className="pointer-events-none absolute left-1 top-0.5 text-[0.65rem] font-black leading-none text-kid-ink/35">
                    {i + 1}
                  </span>
                  <span className="block whitespace-normal break-words pt-2 leading-tight">
                    {cell?.text ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-4 mb-2 text-base font-semibold text-kid-ink/80">Word box</p>
        <div className="flex flex-wrap gap-2">
          {bank.map((tile) => (
            <KidButton
              key={tile.id}
              type="button"
              variant="secondary"
              className={gamesChipButtonClass}
              disabled={passed || kicking.size > 0}
              onClick={() => addWord(tile)}
            >
              {tile.text}
            </KidButton>
          ))}
          {bank.length === 0 ? (
            <p className="text-sm font-semibold text-kid-ink/55">All words are in the sentence.</p>
          ) : null}
        </div>

        {wrongHint ? <p className={gamesWrongHintClass}>{wrongHint}</p> : null}
        {helped && !wrongHint ? (
          <p className="mt-2 text-sm font-bold text-emerald-800">
            Helper filled a word for you — keep building.
          </p>
        ) : null}

        {helpOpen ? (
          <div className="mt-3">
            <HomeworkHelpHintCard
              step={helpStep}
              onClose={() => setHelpOpen(false)}
              onAction={onHelpAction}
            />
            {canPlaceScaffoldHint ? (
              <div className="mt-2">
                <KidButton
                  type="button"
                  variant="secondary"
                  className="!min-h-11 !min-w-0 !px-4 !text-sm"
                  onClick={applyScaffoldFromHelp}
                >
                  Place the hint word
                </KidButton>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={clsx(gamesCheckActionRowClass, "flex-wrap")}>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || kicking.size > 0 || filledUnlockedCount === 0}
            onClick={clearUnlocked}
          >
            Clear
          </KidButton>
          <HomeworkHelpTrigger
            onOpen={() => setHelpOpen(true)}
            className={passed ? "pointer-events-none opacity-40" : undefined}
          />
          <KidButton type="button" disabled={passed || kicking.size > 0} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
