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
  const slots = parsed.sentence_slots.length;
  const bank = parsed.word_bank.filter((w: string) => !filled.includes(w));

  function addWord(w: string) {
    if (passed) return;
    playSfx("tap", muted);
    if (filled.length >= slots) return;
    setFilled([...filled, w]);
  }

  function clearSlot(i: number) {
    if (passed) return;
    playSfx("tap", muted);
    setFilled(filled.filter((_, idx) => idx !== i));
  }

  function check() {
    playSfx("tap", muted);
    if (filled.length !== parsed.correct_order.length) {
      onWrong();
      return;
    }
    const ok = filled.every((w: string, i: number) => w === parsed.correct_order[i]);
    if (ok) onPass();
    else onWrong();
  }

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className="object-contain bg-white"
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-lg">{parsed.body_text}</p>
        ) : null}
        <p className="mb-2 font-semibold">Fill the sentence:</p>
        <div className="flex min-h-14 flex-wrap gap-2 rounded-lg border-4 border-kid-ink p-3">
          {Array.from({ length: slots }).map((_, i) => (
            <button
              key={i}
              type="button"
              disabled={passed}
              onClick={() => clearSlot(i)}
              className="min-w-[5rem] rounded-md border-2 border-neutral-800 bg-neutral-100 px-2 py-2 text-center font-semibold hover:bg-neutral-200 active:bg-neutral-300"
            >
              {filled[i] ?? "—"}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-2 font-semibold">Words</p>
        <div className="flex flex-wrap gap-2">
          {bank.map((w: string) => (
            <KidButton
              key={w}
              type="button"
              variant="secondary"
              className="!min-h-10 !min-w-0 text-base"
              disabled={passed}
              onClick={() => addWord(w)}
            >
              {w}
            </KidButton>
          ))}
        </div>
        <div className="mt-4">
          <KidButton
            type="button"
            variant="secondary"
            disabled={passed || filled.length === 0}
            onClick={() => setFilled([])}
          >
            Clear
          </KidButton>
          <KidButton
            type="button"
            className="ml-3"
            disabled={passed}
            onClick={check}
          >
            Check
          </KidButton>
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
