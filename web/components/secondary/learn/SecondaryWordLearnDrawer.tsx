"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { SecondaryWordClozePreviewCard } from "@/components/secondary/learn/SecondaryWordClozePreviewCard";
import { SecondaryWordExampleList } from "@/components/secondary/learn/SecondaryWordExampleList";
import { SecondaryWordLearnHeader } from "@/components/secondary/learn/SecondaryWordLearnHeader";
import { SecondaryWordMeaningCard } from "@/components/secondary/learn/SecondaryWordMeaningCard";
import { SecondaryWordMemoryTipCard } from "@/components/secondary/learn/SecondaryWordMemoryTipCard";
import { SecondaryWordPracticePanel } from "@/components/secondary/learn/SecondaryWordPracticePanel";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { useModalFocus } from "@/lib/hooks/use-modal-focus";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { getSecondaryTopicTitle, getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

type Props = {
  wordItemId: string | null;
  open: boolean;
  isFocusWord?: boolean;
  sessionWordItemIds?: string[];
  dateKey?: string;
  returnFocusRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
};

export function SecondaryWordLearnDrawer({
  wordItemId,
  open,
  isFocusWord = false,
  sessionWordItemIds = [],
  dateKey = "",
  returnFocusRef,
  onClose,
}: Props) {
  const drawerRef = useRef<HTMLElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  const item = wordItemId ? getSecondaryVocabItemById(wordItemId) : undefined;
  const snapshot = wordItemId ? getSecondaryWordDisplaySnapshot(wordItemId) : null;

  useBodyScrollLock(open && mounted);

  useModalFocus({
    open: mounted && visible,
    containerRef: drawerRef,
    returnFocusRef,
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !scrollBodyRef.current) return;
    scrollBodyRef.current.scrollTop = 0;
  }, [open, wordItemId]);

  if (!mounted || !wordItemId || !item || !snapshot) return null;

  const topicTitle = getSecondaryTopicTitle(item.topicId);
  const wordDescriptionId = "secondary-word-learn-description";

  return (
    <>
      <button
        type="button"
        className={clsx(
          "fixed inset-0 z-[60] cursor-default bg-black/35 [touch-action:manipulation] transition-opacity duration-200 motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
        )}
        aria-label="Close word helper"
        onPointerDown={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secondary-word-learn-title"
        aria-describedby={wordDescriptionId}
        className={clsx(
          "fixed z-[61] flex max-h-[min(90dvh,720px)] w-full flex-col border-2 border-kid-ink bg-white shadow-2xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none bottom-0 left-0 right-0 rounded-t-2xl md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-dvh md:max-h-none md:max-w-md md:rounded-none md:border-l-4 md:border-t-0",
          visible
            ? "translate-y-0 opacity-100 md:translate-x-0 md:translate-y-0"
            : "translate-y-full opacity-0 md:translate-x-full md:translate-y-0",
        )}
      >
        <p className="sr-only" aria-live="polite">
          Word helper open: {item.word}
        </p>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-kid-ink/15 bg-kid-panel px-4 py-3">
          <h2
            className="text-sm font-extrabold uppercase tracking-wide text-kid-ink"
            id="secondary-word-learn-title"
          >
            Word Helper
          </h2>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-9 shrink-0 text-sm"
            onClick={onClose}
          >
            Close
          </KidButton>
        </div>

        <div ref={scrollBodyRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <SecondaryWordLearnHeader
            word={item.word}
            partOfSpeech={item.partOfSpeech}
            topicTitle={topicTitle}
            snapshot={snapshot}
            isFocus={isFocusWord}
            descriptionId={wordDescriptionId}
          />

          <SecondaryWordMeaningCard item={item} />
          <SecondaryWordExampleList item={item} />
          <SecondaryWordClozePreviewCard item={item} />
          <SecondaryWordMemoryTipCard item={item} />
          {dateKey ? (
            <SecondaryWordPracticePanel
              key={`${wordItemId}:${dateKey}`}
              item={item}
              sessionWordItemIds={sessionWordItemIds}
              dateKey={dateKey}
              onClose={onClose}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}
