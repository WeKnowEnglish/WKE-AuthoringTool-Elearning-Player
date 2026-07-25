"use client";

import Image from "next/image";
import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
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

export function DragSentenceView({
  parsed,
  muted,
  filled,
  setFilled,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "drag_sentence" }>;
  muted: boolean;
  filled: string[];
  setFilled: (v: string[]) => void;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [wrongHint, setWrongHint] = useState<string | null>(null);
  const slots = parsed.sentence_slots.length;
  const bank = parsed.word_bank.filter((w: string) => !filled.includes(w));

  function addWord(w: string) {
    if (passed) return;
    playSfx("tap", muted);
    setWrongHint(null);
    if (filled.length >= slots) return;
    setFilled([...filled, w]);
  }

  function clearSlot(i: number) {
    if (passed) return;
    playSfx("tap", muted);
    setWrongHint(null);
    setFilled(filled.filter((_, idx) => idx !== i));
  }

  function check() {
    playSfx("tap", muted);
    if (filled.length !== parsed.correct_order.length) {
      setWrongHint("Not quite yet. Fill every gap, then tap Check again.");
      onWrong();
      return;
    }
    const ok = filled.every((w: string, i: number) => w === parsed.correct_order[i]);
    if (ok) {
      setWrongHint(null);
      onPass();
    } else {
      setWrongHint("Not quite yet. Tap a word in the sentence to remove it, then try again.");
      onWrong();
    }
  }

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
        <p className={gamesHintTextClass}>Tap words to build the sentence</p>
        <div className="flex min-h-16 flex-wrap gap-2 rounded-lg border-4 border-kid-ink bg-kid-surface-muted/30 p-3">
          {Array.from({ length: slots }).map((_, i) => (
            <button
              key={i}
              type="button"
              disabled={passed}
              onClick={() => clearSlot(i)}
              className="min-h-11 min-w-[5rem] rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-center text-base font-bold text-kid-ink hover:bg-kid-surface-muted active:bg-kid-panel disabled:opacity-60"
            >
              {filled[i] ?? "—"}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-2 text-base font-semibold text-kid-ink/80">Word box</p>
        <div className="flex flex-wrap gap-2">
          {bank.map((w: string) => (
            <KidButton
              key={w}
              type="button"
              variant="secondary"
              className={gamesChipButtonClass}
              disabled={passed}
              onClick={() => addWord(w)}
            >
              {w}
            </KidButton>
          ))}
        </div>
        {wrongHint ? <p className={gamesWrongHintClass}>{wrongHint}</p> : null}
        <div className={gamesCheckActionRowClass}>
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || filled.length === 0}
            onClick={() => {
              playSfx("tap", muted);
              setFilled([]);
              setWrongHint(null);
            }}
          >
            Clear
          </KidButton>
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}
