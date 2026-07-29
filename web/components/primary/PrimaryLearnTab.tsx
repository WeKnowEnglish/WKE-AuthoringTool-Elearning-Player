"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Library } from "lucide-react";

import { PrimaryVocabularyTab } from "@/components/primary/PrimaryVocabularyTab";
import { getPublishedGrammarModules } from "@/lib/grammar-builder/load-catalog";
import type { VocabSetId } from "@/lib/vocabulary-templates";

export type LearnCategoryId = "vocabulary" | "grammar";

type LearnView = "shelf" | LearnCategoryId;

type Props = {
  playerLevel: number;
  onOpenSet?: (id: VocabSetId, label: string) => void;
  /** Deep-link / parent-driven category (`null` = shelf). */
  category?: LearnCategoryId | null;
  onCategoryChange?: (category: LearnCategoryId | null) => void;
};

const CATEGORIES: Array<{
  id: LearnCategoryId;
  title: string;
  subtitle: string;
  icon: typeof Library;
}> = [
  {
    id: "vocabulary",
    title: "Vocabulary",
    subtitle: "Learn new words with topic sets from the WKE library.",
    icon: Library,
  },
  {
    id: "grammar",
    title: "Grammar",
    subtitle: "Practice grammar posters and lessons from the WKE library.",
    icon: BookOpen,
  },
];

export function PrimaryLearnTab({
  playerLevel,
  onOpenSet,
  category = null,
  onCategoryChange,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<LearnView>(() => category ?? "shelf");
  const grammarModules = getPublishedGrammarModules();

  useEffect(() => {
    setView(category ?? "shelf");
  }, [category]);

  function openCategory(next: LearnCategoryId) {
    setView(next);
    onCategoryChange?.(next);
  }

  function backToShelf() {
    setView("shelf");
    onCategoryChange?.(null);
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
        <PrimaryVocabularyTab playerLevel={playerLevel} onOpenSet={onOpenSet} />
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
            Choose a grammar lesson from the WKE library.
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
                  onClick={() => router.push(`/grammar/${module.slug}`)}
                  className="group flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex aspect-[16/10] w-full items-center justify-center bg-[var(--pl-purple-soft)] text-5xl">
                    <span aria-hidden>{module.thumbnailEmoji ?? "📘"}</span>
                  </div>
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Learn</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          Choose a learning activity from the WKE library.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openCategory(item.id)}
                className="group flex w-full items-start gap-4 overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-5 text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-lg font-extrabold text-[var(--pl-ink)]">
                      {item.title}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[var(--pl-muted)]">
                    {item.subtitle}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
