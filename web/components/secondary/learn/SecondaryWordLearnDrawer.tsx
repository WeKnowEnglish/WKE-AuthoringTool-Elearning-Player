"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { SecondaryWordClozePreviewCard } from "@/components/secondary/learn/SecondaryWordClozePreviewCard";
import { SecondaryWordExampleList } from "@/components/secondary/learn/SecondaryWordExampleList";
import { SecondaryWordLearnHeader } from "@/components/secondary/learn/SecondaryWordLearnHeader";
import { SecondaryWordMeaningCard } from "@/components/secondary/learn/SecondaryWordMeaningCard";
import { SecondaryWordMemoryTipCard } from "@/components/secondary/learn/SecondaryWordMemoryTipCard";
import { SecondaryWordPracticePanel } from "@/components/secondary/learn/SecondaryWordPracticePanel";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { useModalFocus } from "@/lib/hooks/use-modal-focus";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { getSecondaryTopicTitle, getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type DrawerLayer = "default" | "aboveIntro";
type DrawerCoverage = "viewport" | "main";

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const drawerLayerClass: Record<DrawerLayer, { backdrop: string; panel: string }> = {
  default: { backdrop: "z-[60]", panel: "z-[61]" },
  aboveIntro: { backdrop: "z-[72]", panel: "z-[73]" },
};

type Props = {
  wordItemId: string | null;
  open: boolean;
  coverage?: DrawerCoverage;
  centered?: boolean;
  isFocusWord?: boolean;
  sessionWordItemIds?: string[];
  dateKey?: string;
  layer?: DrawerLayer;
  imageUrl?: string | null;
  anchorRef?: React.RefObject<HTMLElement | null>;
  returnFocusRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
};

function SecondaryWordLearnDrawerBody({
  wordItemId,
  isFocusWord,
  sessionWordItemIds,
  dateKey,
  imageUrl,
  centered,
  onClose,
  scrollBodyRef,
}: {
  wordItemId: string;
  isFocusWord: boolean;
  sessionWordItemIds: string[];
  dateKey: string;
  imageUrl: string | null;
  centered: boolean;
  onClose: () => void;
  scrollBodyRef: React.RefObject<HTMLDivElement | null>;
}) {
  const item = getSecondaryVocabItemById(wordItemId);
  const snapshot = getSecondaryWordDisplaySnapshot(wordItemId);
  if (!item || !snapshot) return null;

  const topicTitle = getSecondaryTopicTitle(item.topicId);

  const practicePanel = dateKey ? (
    <SecondaryWordPracticePanel
      key={`${wordItemId}:${dateKey}`}
      item={item}
      sessionWordItemIds={sessionWordItemIds}
      dateKey={dateKey}
      onClose={onClose}
      centered={false}
    />
  ) : null;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        Word helper: {item.word}
      </p>

      <div className="flex min-h-10 shrink-0 items-center justify-between gap-2 border-b-2 border-kid-ink/15 bg-kid-panel px-3 py-2.5">
        <h2 className={`${secondaryUi.eyebrow} text-kid-ink`} id="secondary-word-learn-title">
          Word Helper
        </h2>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-kid-ink bg-white text-base font-bold leading-none text-kid-ink transition-[transform,background-color] duration-100 [touch-action:manipulation] hover:bg-kid-panel/80 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
          onClick={onClose}
          aria-label="Close word helper"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>

      <div ref={scrollBodyRef} className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {centered ? (
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 grid gap-4 md:mb-6 md:grid-cols-2 md:items-start md:gap-5">
              <SecondaryWordLearnHeader
                word={item.word}
                partOfSpeech={item.partOfSpeech}
                topicTitle={topicTitle}
                snapshot={snapshot}
                isFocus={isFocusWord}
                descriptionId="secondary-word-learn-description"
                imageUrl={imageUrl}
                stacked
              />
              <SecondaryWordMeaningCard
                key={item.wordItemId}
                item={item}
                sessionWordItemIds={sessionWordItemIds}
                dateKey={dateKey}
                centered
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <div className="space-y-4 md:space-y-5">
                <SecondaryWordExampleList item={item} />
              </div>

              <div className="space-y-4 md:space-y-5">
                <SecondaryWordClozePreviewCard item={item} />
                <SecondaryWordMemoryTipCard key={item.wordItemId} item={item} />
              </div>

              {practicePanel ? <div className="md:col-span-2">{practicePanel}</div> : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SecondaryWordLearnHeader
              word={item.word}
              partOfSpeech={item.partOfSpeech}
              topicTitle={topicTitle}
              snapshot={snapshot}
              isFocus={isFocusWord}
              descriptionId="secondary-word-learn-description"
              imageUrl={imageUrl}
            />
            <SecondaryWordMeaningCard
              key={item.wordItemId}
              item={item}
              sessionWordItemIds={sessionWordItemIds}
              dateKey={dateKey}
            />
            <SecondaryWordExampleList item={item} />
            <SecondaryWordClozePreviewCard item={item} />
            <SecondaryWordMemoryTipCard key={item.wordItemId} item={item} />
            {practicePanel}
          </div>
        )}
      </div>
    </>
  );
}

export function SecondaryWordLearnDrawer({
  wordItemId,
  open,
  coverage = "viewport",
  centered = false,
  isFocusWord = false,
  sessionWordItemIds = [],
  dateKey = "",
  layer = "default",
  imageUrl = null,
  anchorRef,
  returnFocusRef,
  onClose,
}: Props) {
  const isMainCoverage = coverage === "main";
  const layerClass = drawerLayerClass[layer];
  const drawerRef = useRef<HTMLElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);

  const hasWord = Boolean(wordItemId && getSecondaryVocabItemById(wordItemId));
  const usesAnchoredMain = isMainCoverage && Boolean(anchorRef);

  useLayoutEffect(() => {
    if (!usesAnchoredMain || !anchorRef?.current) {
      setAnchorRect(null);
      return;
    }

    const element = anchorRef.current;

    function update() {
      const rect = element.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      const bottomGutter = 12;
      const maxHeight = Math.max(280, viewportBottom - rect.top - bottomGutter);
      const height = Math.min(rect.height, maxHeight);

      setAnchorRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height,
      });
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [usesAnchoredMain, anchorRef, open, mounted]);

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
    if (!hasWord || !scrollBodyRef.current) return;
    scrollBodyRef.current.scrollTop = 0;
  }, [wordItemId, hasWord]);

  useEffect(() => {
    if (!hasWord || !imageUrl) return;
    void prefetchImageUrls([imageUrl]);
  }, [hasWord, imageUrl]);

  if (!mounted || !wordItemId || !hasWord) return null;
  if (usesAnchoredMain && !anchorRect) return null;

  const anchoredStyle = usesAnchoredMain && anchorRect
    ? {
        top: anchorRect.top,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height,
      }
    : undefined;

  const backdropClass = usesAnchoredMain
    ? `fixed ${layerClass.backdrop}`
    : isMainCoverage
      ? `absolute inset-0 ${layerClass.backdrop}`
      : `fixed inset-0 ${layerClass.backdrop}`;

  const panelClass = usesAnchoredMain
    ? `fixed ${layerClass.panel} flex min-h-0 flex-col border-2 border-kid-ink border-l-4 bg-white shadow-2xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none`
    : isMainCoverage
      ? `relative absolute inset-y-0 right-0 left-0 ${layerClass.panel} flex h-full min-h-0 flex-col border-2 border-kid-ink border-l-4 bg-white shadow-2xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none`
      : `fixed ${layerClass.panel} flex max-h-[min(90dvh,720px)] w-full flex-col border-2 border-kid-ink bg-white shadow-2xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none bottom-0 left-0 right-0 rounded-t-2xl md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-dvh md:max-h-none md:max-w-md md:rounded-none md:border-l-4 md:border-t-0`;

  const panelVisibleClass = isMainCoverage
    ? "translate-x-0 opacity-100"
    : "translate-y-0 opacity-100 md:translate-x-0 md:translate-y-0";

  const panelHiddenClass = isMainCoverage
    ? "translate-x-full opacity-0"
    : "translate-y-full opacity-0 md:translate-x-full md:translate-y-0";

  return (
    <>
      <button
        type="button"
        style={anchoredStyle}
        className={clsx(
          `${backdropClass} cursor-default bg-black/35 [touch-action:manipulation] transition-opacity duration-200 motion-reduce:transition-none`,
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
        style={anchoredStyle}
        className={clsx(panelClass, visible ? panelVisibleClass : panelHiddenClass)}
      >
        <SecondaryWordLearnDrawerBody
          wordItemId={wordItemId}
          isFocusWord={isFocusWord}
          sessionWordItemIds={sessionWordItemIds}
          dateKey={dateKey}
          imageUrl={imageUrl}
          centered={centered}
          onClose={onClose}
          scrollBodyRef={scrollBodyRef}
        />
      </aside>
    </>
  );
}
