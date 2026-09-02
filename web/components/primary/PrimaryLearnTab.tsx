"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, Library, Lock } from "lucide-react";

import { PrimaryVocabularyTab } from "@/components/primary/PrimaryVocabularyTab";
import { PrimaryGrammarPosterThumbnail } from "@/components/primary/PrimaryGrammarPosterThumbnail";
import { getPublishedGrammarModules } from "@/lib/grammar-builder/load-catalog";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { resumeScreenIndexForSet } from "@/lib/primary/vocab-continue";
import { isVocabSetQuizReady } from "@/lib/pilots/vocab-player-pool";
import {
  isUnlockAvailable,
  minLevelForUnlock,
} from "@/lib/progress/unlock-registry";
import {
  VOCAB_TOP_MENU,
  vocabSetCoverImageSrc,
  type VocabSetId,
} from "@/lib/vocabulary-templates";
import type { VocabHubId } from "@/lib/worlds/types";

export type LearnCategoryId = "vocabulary" | "grammar";

type LearnView = "shelf" | LearnCategoryId;

type Props = {
  playerLevel: number;
  onOpenSet?: (id: VocabSetId, label: string) => void;
  /** Open a grammar poster in the Primary overlay (stay on /primary). */
  onOpenGrammarPoster?: (slug: string) => void;
  /** Deep-link / parent-driven category (`null` = shelf). */
  category?: LearnCategoryId | null;
  onCategoryChange?: (category: LearnCategoryId | null) => void;
};

export function PrimaryLearnTab({
  playerLevel,
  onOpenSet,
  onOpenGrammarPoster,
  category = null,
  onCategoryChange,
}: Props) {
  const hydrated = useClientHydrated();
  const [view, setView] = useState<LearnView>(() => category ?? "shelf");
  const [vocabHubId, setVocabHubId] = useState<VocabHubId | null>(null);
  const grammarModules = getPublishedGrammarModules();

  useEffect(() => {
    setView(category ?? "shelf");
    if (!category) setVocabHubId(null);
  }, [category]);

  function openCategory(next: LearnCategoryId) {
    setView(next);
    onCategoryChange?.(next);
  }

  function openVocabHub(hubId: VocabHubId) {
    setVocabHubId(hubId);
    openCategory("vocabulary");
  }

  function backToShelf() {
    setView("shelf");
    setVocabHubId(null);
    onCategoryChange?.(null);
  }

  function openVocabSet(id: VocabSetId, label: string) {
    const setUnlockId = `vocab_set:${id}` as const;
    if (!isUnlockAvailable(setUnlockId, playerLevel)) return;
    if (!isVocabSetQuizReady(id)) return;
    onOpenSet?.(id, label);
  }

  if (view === "vocabulary") {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={backToShelf}
          className="mx-auto inline-flex w-full max-w-5xl items-center gap-1.5 text-sm font-extrabold text-[var(--pl-purple)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Learn
        </button>
        <PrimaryVocabularyTab
          playerLevel={playerLevel}
          onOpenSet={onOpenSet}
          initialHubId={vocabHubId}
        />
      </div>
    );
  }

  if (view === "grammar") {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
        <header>
          <button
            type="button"
            onClick={backToShelf}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--pl-purple)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Learn
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Grammar
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
            Choose a grammar poster from the WKE library.
          </p>
        </header>

        {grammarModules.length === 0 ? (
          <p className="rounded-[1.5rem] border border-[var(--pl-border)] bg-white px-4 py-5 text-sm font-semibold text-[var(--pl-muted)] shadow-sm">
            Grammar lessons are coming soon.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grammarModules.map((module) => (
              <li key={module.slug}>
                <button
                  type="button"
                  onClick={() => onOpenGrammarPoster?.(module.slug)}
                  className="group flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
                >
                  <PrimaryGrammarPosterThumbnail
                    slug={module.slug}
                    emoji={module.thumbnailEmoji}
                  />
                  <div className="flex items-start justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <p className="text-base font-extrabold text-[var(--pl-ink)]">
                        {module.title}
                      </p>
                      {module.description ? (
                        <p className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">
                          {module.description}
                        </p>
                      ) : null}
                      {module.difficulty ? (
                        <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-[var(--pl-purple)]">
                          {module.difficulty}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const vocabHubLocked = !isUnlockAvailable("vocab_sets_menu", playerLevel);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24 lg:pb-8">
      <header className="px-0.5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Learn</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          Choose a learning path, or browse Easy Readers, Comics, Vocabulary, and Grammar.
        </p>
      </header>

      <LearnShelf
        title="WKE Learning Paths"
        subtitle="Complete courses built for your level"
        icon={<GraduationCap className="h-5 w-5" aria-hidden />}
      >
        <Link
          href="/primary/learn/grade-4"
          data-shelf-card
          aria-label="Open Grade 4 WKE Learning Paths"
          className="group flex w-[15rem] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-sky-200 bg-white text-left shadow-sm transition hover:border-sky-400 hover:shadow-md active:scale-[0.99] sm:w-[18rem]"
        >
          <span className="relative aspect-[16/9] w-full overflow-hidden bg-sky-100">
            <NextImage
              src="/curriculum/grade-4-movers/unit-1/welcome-fair.png"
              alt="A lively school welcome fair with activity stations"
              fill
              draggable={false}
              className="pointer-events-none object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <span className="absolute left-2 top-2 rounded-full bg-sky-600 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              Grade 4 · Movers
            </span>
          </span>
          <span className="flex items-start justify-between gap-2 p-4">
            <span className="min-w-0">
              <span className="block text-base font-extrabold text-[var(--pl-ink)]">
                Unit 1 · Meet Me!
              </span>
              <span className="mt-1 block text-xs font-semibold text-[var(--pl-muted)]">
                Explore the welcome fair and practise introducing yourself.
              </span>
              <span className="mt-2 block text-[10px] font-extrabold uppercase tracking-wide text-sky-700">
                Session 1 ready
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </LearnShelf>

      <LearnShelf
        title="Easy Readers"
        subtitle="Read, listen, learn new words, and check understanding"
        icon={<BookOpen className="h-5 w-5" aria-hidden />}
      >
        <Link
          href="/primary/learn/easy-readers/the-new-student"
          data-shelf-card
          aria-label="Read The New Student, A1 Easy Reader Book 1"
          className="group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-blue-200 bg-white text-left shadow-sm transition hover:border-blue-400 hover:shadow-md active:scale-[0.99] sm:w-[13rem]"
        >
          <span className="relative aspect-[3/4] w-full overflow-hidden bg-sky-100">
            <NextImage
              src="/easy-readers/book-1/cover.png"
              alt="Cover of The New Student"
              fill
              draggable={false}
              className="pointer-events-none object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <span className="absolute left-2 top-2 rounded-full bg-[#173b8f] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              A1 · Book 1
            </span>
          </span>
          <span className="flex items-start justify-between gap-1.5 p-3">
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-snug text-[var(--pl-ink)]">
                The New Student
              </span>
              <span className="mt-1 block line-clamp-2 text-[11px] font-semibold text-[var(--pl-muted)]">
                Join Sam on his first day and meet two new friends.
              </span>
              <span className="mt-2 block text-[10px] font-extrabold uppercase tracking-wide text-blue-700">
                6 chapters · Start reading
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </LearnShelf>

      <LearnShelf
        title="Comics"
        subtitle="Read, predict, and explore new words"
        icon={<BookOpen className="h-5 w-5" aria-hidden />}
      >
        <Link
          href="/primary/learn/mias-morning"
          data-shelf-card
          className="group flex w-[11.5rem] shrink-0 flex-col justify-between rounded-[1.5rem] border border-violet-200 bg-gradient-to-br from-violet-100 via-white to-amber-50 p-4 shadow-sm transition hover:shadow-md sm:w-[13rem]"
        >
          <span><span className="inline-flex rounded-full bg-violet-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white">Complete unit</span><span className="mt-8 block text-lg font-extrabold text-[var(--pl-ink)]">Mia&apos;s Morning</span><span className="mt-1 block text-xs font-semibold text-[var(--pl-muted)]">Explore Mia&apos;s routine, listen, and complete the story.</span></span>
          <span className="mt-5 flex items-center justify-between text-xs font-extrabold text-violet-700">Start learning <ChevronRight className="h-4 w-4" /></span>
        </Link>
        <Link
          href="/wke/comic"
          data-shelf-card
          aria-label="Read Comic Adventures: A New Friend Arrives"
          className="group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99] sm:w-[13rem]"
        >
          <span className="relative aspect-[16/10] w-full overflow-hidden bg-sky-100">
            <NextImage
              src="/comics/chapter-1/art/cover-art-v1.png"
              alt="Mia, Zara, Ethan, and Leo in A New Friend Arrives"
              fill
              draggable={false}
              className="pointer-events-none object-cover object-[center_58%] transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <span className="absolute left-2 top-2 rounded-full bg-sky-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              Interactive
            </span>
          </span>
          <span className="flex items-start justify-between gap-1.5 p-3">
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-snug text-[var(--pl-ink)]">
                Comic Adventures
              </span>
              <span className="mt-1 block line-clamp-2 text-[11px] font-semibold text-[var(--pl-muted)]">
                A New Friend Arrives
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
          </span>
        </Link>
        <Link
          href="/wke/comic?chapter=chapter-2"
          data-shelf-card
          aria-label="Read Comic Adventures Chapter 2"
          className="group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99] sm:w-[13rem]"
        >
          <span className="relative aspect-[16/10] w-full overflow-hidden bg-sky-100">
            <NextImage
              src="/comics/chapter-2/art/page-01-art-v1.png"
              alt="The four friends meet Keelan in Chapter 2"
              fill
              draggable={false}
              className="pointer-events-none object-cover object-top transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <span className="absolute left-2 top-2 rounded-full bg-sky-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              New
            </span>
          </span>
          <span className="flex items-start justify-between gap-1.5 p-3">
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-snug text-[var(--pl-ink)]">
                Chapter 2
              </span>
              <span className="mt-1 block line-clamp-2 text-[11px] font-semibold text-[var(--pl-muted)]">
                A Safe Place
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
          </span>
        </Link>
      </LearnShelf>

      <LearnShelf
        title="Vocabulary"
        subtitle="Topic sets from the WKE library"
        icon={<Library className="h-5 w-5" aria-hidden />}
      >
        {VOCAB_TOP_MENU.map((entry) => {
          if (entry.kind === "hub") {
            return (
              <ShelfCard
                key={entry.hubId}
                label={entry.label}
                subtitle={entry.subtitle}
                imageSrc={entry.coverImageUrl}
                locked={vocabHubLocked}
                unlockLevel={minLevelForUnlock("vocab_sets_menu")}
                onClick={() => {
                  if (vocabHubLocked) return;
                  openVocabHub(entry.hubId);
                }}
              />
            );
          }

          const setUnlockId = `vocab_set:${entry.id}` as const;
          const setLocked = !isUnlockAvailable(setUnlockId, playerLevel);
          const needsPictures = hydrated && !setLocked && !isVocabSetQuizReady(entry.id);
          return (
            <ShelfCard
              key={entry.id}
              label={entry.label}
              imageSrc={vocabSetCoverImageSrc(entry.id)}
              locked={setLocked}
              needsPictures={needsPictures}
              unlockLevel={minLevelForUnlock(setUnlockId)}
              continueLabel={
                hydrated &&
                !setLocked &&
                !needsPictures &&
                resumeScreenIndexForSet(entry.id) > 0
                  ? "Continue"
                  : null
              }
              onClick={() => openVocabSet(entry.id, entry.label)}
            />
          );
        })}
      </LearnShelf>

      <LearnShelf
        title="Grammar"
        subtitle="Posters and lessons from the WKE library"
        icon={<BookOpen className="h-5 w-5" aria-hidden />}
      >
        {grammarModules.length === 0 ? (
          <p className="w-[16rem] shrink-0 rounded-[1.5rem] border border-dashed border-[var(--pl-border)] bg-white px-4 py-8 text-sm font-semibold text-[var(--pl-muted)]">
            Grammar lessons are coming soon.
          </p>
        ) : (
          grammarModules.map((module) => (
            <button
              key={module.slug}
              type="button"
              data-shelf-card
              onClick={() => onOpenGrammarPoster?.(module.slug)}
              className="group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99] sm:w-[13rem]"
            >
              <PrimaryGrammarPosterThumbnail
                slug={module.slug}
                emoji={module.thumbnailEmoji}
              />
              <span className="flex items-start justify-between gap-1.5 p-3">
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-extrabold leading-snug text-[var(--pl-ink)]">
                    {module.title}
                  </span>
                  {module.difficulty ? (
                    <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-wide text-[var(--pl-purple)]">
                      {module.difficulty}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
              </span>
            </button>
          ))
        )}
      </LearnShelf>
    </div>
  );
}

function LearnShelf({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;
      // Only hijack when the shelf can actually move in that direction.
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
    }
    if (drag.moved) {
      el.scrollLeft = drag.startScrollLeft - dx;
      event.preventDefault();
    }
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    // Block the click that fires after a drag so cards don't open accidentally.
    if (drag.moved) {
      const blockClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      };
      el?.addEventListener("click", blockClick, { capture: true, once: true });
    }
    dragRef.current = null;
  }

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-3 px-0.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-[var(--pl-ink)]">{title}</h2>
          <p className="text-xs font-semibold text-[var(--pl-muted)]">{subtitle}</p>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain pb-1 active:cursor-grabbing touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}

function ShelfCard({
  label,
  subtitle,
  imageSrc,
  locked,
  needsPictures = false,
  unlockLevel,
  continueLabel,
  onClick,
}: {
  label: string;
  subtitle?: string;
  imageSrc: string;
  locked: boolean;
  needsPictures?: boolean;
  unlockLevel: number;
  continueLabel?: string | null;
  onClick: () => void;
}) {
  const disabled = locked || needsPictures;
  return (
    <button
      type="button"
      data-shelf-card
      disabled={disabled}
      aria-label={
        locked
          ? `${label} — unlocks at level ${unlockLevel}`
          : needsPictures
            ? `${label} — pictures coming soon`
            : label
      }
      onClick={onClick}
      className={`group flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition sm:w-[13rem] ${
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:border-[var(--pl-purple)]/40 hover:shadow-md"
      }`}
    >
      <span className="relative aspect-[16/10] w-full bg-[var(--pl-purple-soft)]">
        <NextImage
          src={imageSrc}
          alt=""
          fill
          draggable={false}
          className={`pointer-events-none object-cover ${disabled ? "grayscale" : ""}`}
          unoptimized
        />
        {locked ? (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-[var(--pl-ink)]">
              <Lock className="h-3 w-3" aria-hidden />
              Lvl {unlockLevel}
            </span>
          </span>
        ) : null}
        {!locked && needsPictures ? (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-[var(--pl-ink)]">
              Soon
            </span>
          </span>
        ) : null}
        {!locked && !needsPictures && continueLabel ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--pl-teal)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
            {continueLabel}
          </span>
        ) : null}
      </span>
      <span className="flex items-start justify-between gap-1.5 p-3">
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm font-extrabold leading-snug text-[var(--pl-ink)]">
            {label}
          </span>
          {locked ? (
            <span className="mt-1 block text-[11px] font-semibold text-[var(--pl-muted)]">
              Unlocks at level {unlockLevel}
            </span>
          ) : needsPictures ? (
            <span className="mt-1 block text-[11px] font-semibold text-[var(--pl-muted)]">
              Pictures coming soon
            </span>
          ) : subtitle ? (
            <span className="mt-1 block line-clamp-2 text-[11px] font-semibold text-[var(--pl-muted)]">
              {subtitle}
            </span>
          ) : null}
        </span>
        {!disabled ? (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
        ) : null}
      </span>
    </button>
  );
}
