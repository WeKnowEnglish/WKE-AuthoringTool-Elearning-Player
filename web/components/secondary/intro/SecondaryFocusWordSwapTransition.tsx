"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { SecondaryButton } from "@/components/secondary/SecondaryButton";
import {
  SecondaryIntroModalShell,
  secondaryIntroModalButtonClass,
} from "@/components/secondary/intro/SecondaryIntroModalShell";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { useModalFocus } from "@/lib/hooks/use-modal-focus";
import type { SecondaryFocusWordSwap } from "@/lib/secondary/secondary-session-swap-detect";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

type Props = {
  open: boolean;
  swap: SecondaryFocusWordSwap | null;
  onContinue: () => void;
};

export function SecondaryFocusWordSwapTransition({ open, swap, onContinue }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const outWord = swap ? (getSecondaryVocabItemById(swap.outWordItemId)?.word ?? swap.outWordItemId) : "";
  const inWord = swap ? (getSecondaryVocabItemById(swap.inWordItemId)?.word ?? swap.inWordItemId) : "";

  useBodyScrollLock(open && mounted);

  useModalFocus({
    open: mounted && visible,
    containerRef: dialogRef,
    returnFocusRef: dismissFocusRef,
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      setAnimateIn(false);
      const frame = window.requestAnimationFrame(() => {
        setVisible(true);
        window.requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    setAnimateIn(false);
    const timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [open, swap?.outWordItemId, swap?.inWordItemId]);

  if (!mounted || !swap) return null;

  return (
    <SecondaryIntroModalShell
      dialogRef={dialogRef}
      visible={visible}
      backdropZIndexClass="z-[75]"
      zIndexClass="z-[76]"
      maxWidthClass="max-w-md"
      title="Nice work!"
      titleId="secondary-swap-transition-title"
      description="A new word joined your focus list."
      descriptionId="secondary-swap-transition-description"
      liveMessage={`A new focus word joined your list: ${inWord}.`}
      footer={
        <div className="flex justify-center">
          <SecondaryButton type="button" className={clsx(secondaryIntroModalButtonClass, "sm:flex-none")} onClick={onContinue}>
            Continue
          </SecondaryButton>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <span
          className={clsx(
            `inline-flex max-w-full rounded-lg border-2 border-sec-ink/25 bg-sec-panel/50 px-4 py-3 text-center ${secondaryUi.word} transition-all duration-300 motion-reduce:transition-none`,
            animateIn ? "opacity-40 motion-reduce:opacity-70" : "opacity-100",
          )}
        >
          {outWord}
        </span>
        <span className={`${secondaryUi.body} shrink-0 text-sec-ink/50`} aria-hidden>
          ↓
        </span>
        <span
          className={clsx(
            `inline-flex max-w-full items-center justify-center gap-2 rounded-lg border-2 border-sky-700 bg-sky-50 px-4 py-3 text-center ${secondaryUi.word} transition-all duration-300 motion-reduce:transition-none sm:max-w-none`,
            animateIn ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100 motion-reduce:opacity-100",
          )}
        >
          {inWord}
          <span className={`shrink-0 rounded px-1.5 py-0.5 ${secondaryUi.tag} bg-sky-100 text-sky-800`}>
            New
          </span>
        </span>
      </div>
    </SecondaryIntroModalShell>
  );
}
