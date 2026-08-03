"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { ComicPageCanvas } from "@/components/comic/ComicPageCanvas";
import type { ComicLetteringElement } from "@/lib/comic/overlay";
import type { ComicChapterWithPages } from "@/lib/comic/types";

type Props = {
  chapter: ComicChapterWithPages;
};

/** Responsive layered comic reader with animated editable lettering and learning supports. */
export function ComicReader({ chapter }: Props) {
  const pages = chapter.pages;
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<"idle" | "next" | "prev">("idle");
  const [textVisible, setTextVisible] = useState(true);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [activeVocabularyId, setActiveVocabularyId] = useState<string | null>(null);
  const [animationEpoch, setAnimationEpoch] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const popTimeoutRef = useRef<number | null>(null);

  const total = pages.length;
  const firstPageIsCover =
    pages[0]?.originalFilename.toLowerCase().includes("cover") ?? false;
  const current = pages[index] ?? null;
  const prevPage = index > 0 ? pages[index - 1] : null;
  const nextPage = index < total - 1 ? pages[index + 1] : null;
  const hasLettering = Boolean(current?.overlay?.elements.length);
  const vocabulary = current?.overlay?.vocabulary ?? [];
  const cast = current?.overlay?.cast ?? [];
  const activeVocabulary =
    vocabulary.find((entry) => entry.id === activeVocabularyId) ?? null;

  const clearBubblePop = useCallback(() => {
    if (popTimeoutRef.current) window.clearTimeout(popTimeoutRef.current);
    popTimeoutRef.current = null;
    setActiveElementId(null);
  }, []);

  const goTo = useCallback(
    (nextIndex: number, direction: "next" | "prev") => {
      if (nextIndex < 0 || nextIndex >= total || nextIndex === index) return;
      clearBubblePop();
      setTurning(direction);
      window.setTimeout(() => {
        setIndex(nextIndex);
        setActiveVocabularyId(null);
        setAnimationEpoch(0);
        setTurning("idle");
      }, 140);
    },
    [clearBubblePop, index, total],
  );

  const goPrev = useCallback(() => goTo(index - 1, "prev"), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1, "next"), [goTo, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "Home") {
        event.preventDefault();
        goTo(0, "prev");
      }
      if (event.key === "End") {
        event.preventDefault();
        goTo(total - 1, "next");
      }
      if (event.key === "Escape") clearBubblePop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearBubblePop, goNext, goPrev, goTo, total]);

  useEffect(() => () => clearBubblePop(), [clearBubblePop]);

  const prefetchUrls = useMemo(
    () => [prevPage?.publicUrl, nextPage?.publicUrl].filter(Boolean) as string[],
    [nextPage?.publicUrl, prevPage?.publicUrl],
  );

  const handleElementClick = useCallback(
    (element: ComicLetteringElement) => {
      clearBubblePop();
      setActiveElementId(element.id);
      popTimeoutRef.current = window.setTimeout(
        () => setActiveElementId((id) => (id === element.id ? null : id)),
        650,
      );
    },
    [clearBubblePop],
  );

  if (total === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white">
        <BookOpen className="h-16 w-16 text-sky-400" aria-hidden />
        <h1 className="mt-5 text-4xl font-black tracking-tight">{chapter.title}</h1>
        <p className="mt-3 max-w-md text-base font-semibold text-white/65">
          Pages will appear here once the chapter is uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/95 px-3 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-400">
              WKE interactive comic
            </p>
            <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
              {chapter.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTextVisible((visible) => !visible)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-bold hover:border-sky-400 hover:bg-sky-500"
              aria-pressed={!textVisible}
            >
              {textVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {textVisible ? "Art only" : "Show text"}
            </button>
            <button
              type="button"
              onClick={goPrev}
              disabled={!prevPage}
              aria-label="Previous page"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 enabled:hover:border-sky-400 enabled:hover:bg-sky-500 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="min-w-[4rem] text-center text-sm font-black tabular-nums">
              {index + 1}<span className="text-white/40"> / {total}</span>
            </p>
            <button
              type="button"
              onClick={goNext}
              disabled={!nextPage}
              aria-label="Next page"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 enabled:hover:border-sky-400 enabled:hover:bg-sky-500 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main
        className="relative flex-1 overflow-y-auto px-2 py-4 sm:px-4"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          const end = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (start == null || end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < 48) return;
          if (delta > 0) goPrev();
          else goNext();
        }}
      >
        <div className="mx-auto grid max-w-[1180px] items-start gap-4 lg:grid-cols-[minmax(0,820px)_280px]">
          <div
            className={`mx-auto w-full transition duration-150 ease-out ${
              turning === "next"
                ? "translate-x-3 opacity-90"
                : turning === "prev"
                  ? "-translate-x-3 opacity-90"
                  : "translate-x-0 opacity-100"
            }`}
          >
            {current ? (
              <ComicPageCanvas
                key={current.id}
                page={current}
                textVisible={textVisible}
                animateLettering
                animationEpoch={animationEpoch}
                activeElementId={activeElementId}
                onElementClick={handleElementClick}
              />
            ) : null}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <button
                type="button"
                onClick={() => {
                  clearBubblePop();
                  setTextVisible(true);
                  setAnimationEpoch((epoch) => epoch + 1);
                }}
                disabled={!hasLettering}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-black text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" /> Replay bubbles
              </button>
              <p className="mt-2 text-center text-xs text-white/55">
                Bubbles enter in story order. Tap one to make it pop.
              </p>
            </section>

            {cast.length > 0 ? (
              <section className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-3">
                <h2 className="text-sm font-black text-sky-100">Meet the friends</h2>
                <div className="mt-2 space-y-2">
                  {cast.map((character) => (
                    <div key={character.speakerId} className="rounded-xl bg-black/20 p-2.5">
                      <p className="flex items-center gap-2 text-sm font-black text-white">
                        <span
                          className="h-3 w-3 rounded-full ring-2 ring-white/20"
                          style={{ backgroundColor: character.color }}
                          aria-hidden
                        />
                        {character.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-sky-50/75">
                        {character.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {vocabulary.length > 0 ? (
              <section className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-amber-100">
                  <BookOpen className="h-4 w-4" /> Words to explore
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vocabulary.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setActiveVocabularyId(entry.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                        activeVocabularyId === entry.id
                          ? "border-amber-200 bg-amber-200 text-neutral-950"
                          : "border-amber-200/30 bg-black/15 text-amber-50 hover:border-amber-200"
                      }`}
                    >
                      {entry.term}
                    </button>
                  ))}
                </div>
                {activeVocabulary ? (
                  <div className="mt-3 rounded-xl bg-black/25 p-3 text-sm text-amber-50">
                    <p className="font-black">{activeVocabulary.term}</p>
                    <p className="mt-1 text-amber-50/85">{activeVocabulary.definition}</p>
                    {activeVocabulary.example ? (
                      <p className="mt-2 italic text-amber-100/65">{activeVocabulary.example}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {current?.overlay?.discussionPrompt ? (
              <section className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-violet-100">
                  <Lightbulb className="h-4 w-4" /> Think and talk
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-violet-50/90">
                  {current.overlay.discussionPrompt}
                </p>
              </section>
            ) : null}
          </aside>
        </div>

        {total > 1 ? (
          <div className="mx-auto mt-4 max-w-[1180px] border-t border-white/10 pt-3">
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {pages.map((page, pageIndex) => {
                const visiblePageNumber = firstPageIsCover ? pageIndex : pageIndex + 1;
                const isCover = firstPageIsCover && pageIndex === 0;
                const pageLabel = isCover ? "cover" : `page ${visiblePageNumber}`;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => goTo(pageIndex, pageIndex > index ? "next" : "prev")}
                    className={`relative h-20 w-[3.75rem] shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-24 sm:w-[4.5rem] ${
                      pageIndex === index
                        ? "border-sky-400 ring-2 ring-sky-400/40"
                        : "border-white/15 opacity-60 hover:border-white/50 hover:opacity-100"
                    }`}
                    aria-label={`Go to ${pageLabel}`}
                  >
                    <Image src={page.publicUrl} alt="" fill unoptimized className="object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[10px] font-black">
                      {isCover ? "Cover" : visiblePageNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </main>

      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
        {prefetchUrls.map((url) => (
          <Image key={url} src={url} alt="" width={1400} height={1900} unoptimized />
        ))}
      </div>
    </div>
  );
}
