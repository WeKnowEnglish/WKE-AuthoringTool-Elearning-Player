"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { ComicChapterWithPages } from "@/lib/comic/types";

type Props = {
  chapter: ComicChapterWithPages;
};

/**
 * Full-bleed comic reader with adjacent-page prefetch for snappy turns.
 */
export function ComicReader({ chapter }: Props) {
  const pages = chapter.pages;
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<"idle" | "next" | "prev">("idle");
  const touchStartX = useRef<number | null>(null);

  const total = pages.length;
  const current = pages[index] ?? null;
  const prevPage = index > 0 ? pages[index - 1] : null;
  const nextPage = index < total - 1 ? pages[index + 1] : null;

  const goTo = useCallback(
    (nextIndex: number, direction: "next" | "prev") => {
      if (nextIndex < 0 || nextIndex >= total || nextIndex === index) return;
      setTurning(direction);
      window.setTimeout(() => {
        setIndex(nextIndex);
        setTurning("idle");
      }, 140);
    },
    [index, total],
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, goTo, total]);

  const prefetchUrls = useMemo(
    () => [prevPage?.publicUrl, nextPage?.publicUrl].filter(Boolean) as string[],
    [nextPage?.publicUrl, prevPage?.publicUrl],
  );

  if (total === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white">
        <BookOpen className="h-16 w-16 text-sky-400" aria-hidden />
        <h1 className="mt-5 text-4xl font-black tracking-tight">{chapter.title}</h1>
        <p className="mt-3 max-w-md text-base font-semibold text-white/65">
          Pages will appear here once Chapter 1 is uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 text-white">
      <header className="z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-400">
            WKE Comic
          </p>
          <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl md:text-3xl">
            {chapter.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={!prevPage}
            aria-label="Previous page"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/15 bg-white/5 text-white transition enabled:hover:border-sky-400 enabled:hover:bg-sky-500 enabled:hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <p className="min-w-[4.5rem] text-center text-sm font-black tabular-nums sm:text-base">
            {index + 1}
            <span className="text-white/40"> / {total}</span>
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={!nextPage}
            aria-label="Next page"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/15 bg-white/5 text-white transition enabled:hover:border-sky-400 enabled:hover:bg-sky-500 enabled:hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main
        className="relative flex min-h-0 flex-1 flex-col"
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
        <div
          className={`relative mx-auto flex w-full max-w-[1100px] flex-1 items-center justify-center px-2 py-3 sm:px-4 sm:py-4 transition-transform duration-150 ease-out ${
            turning === "next"
              ? "translate-x-3 opacity-90"
              : turning === "prev"
                ? "-translate-x-3 opacity-90"
                : "translate-x-0 opacity-100"
          }`}
        >
          <button
            type="button"
            aria-label="Previous page"
            disabled={!prevPage}
            onClick={goPrev}
            className="absolute inset-y-0 left-0 z-10 w-[28%] cursor-w-resize disabled:cursor-default"
          />
          <button
            type="button"
            aria-label="Next page"
            disabled={!nextPage}
            onClick={goNext}
            className="absolute inset-y-0 right-0 z-10 w-[28%] cursor-e-resize disabled:cursor-default"
          />

          {current ? (
            <Image
              key={current.id}
              src={current.publicUrl}
              alt={`${chapter.title} — page ${current.pageIndex}`}
              width={1400}
              height={1900}
              priority
              unoptimized
              className="h-auto max-h-[calc(100dvh-9.5rem)] w-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.65)]"
            />
          ) : null}
        </div>

        {total > 1 ? (
          <div className="border-t border-white/10 bg-black/40 px-3 py-3 sm:px-5">
            <div className="mx-auto flex max-w-[1100px] gap-2.5 overflow-x-auto pb-0.5">
              {pages.map((page, pageIndex) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() =>
                    goTo(pageIndex, pageIndex > index ? "next" : "prev")
                  }
                  className={`relative h-20 w-[3.75rem] shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-24 sm:w-[4.5rem] ${
                    pageIndex === index
                      ? "border-sky-400 ring-2 ring-sky-400/40"
                      : "border-white/15 opacity-60 hover:border-white/50 hover:opacity-100"
                  }`}
                  aria-label={`Go to page ${page.pageIndex}`}
                >
                  <Image
                    src={page.publicUrl}
                    alt=""
                    width={120}
                    height={160}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[10px] font-black tabular-nums">
                    {pageIndex + 1}
                  </span>
                </button>
              ))}
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
