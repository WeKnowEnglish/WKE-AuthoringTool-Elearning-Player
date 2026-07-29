"use client";

import NextImage from "next/image";
import { BookOpen, RefreshCw } from "lucide-react";
import type { PrimaryReviewModel } from "@/lib/primary/build-primary-review-model";
import type { VocabSetId } from "@/lib/vocabulary-templates";

type Props = {
  model: PrimaryReviewModel;
  onPracticeSet: (setId: VocabSetId) => void;
  onOpenVocabulary?: () => void;
};

export function PrimaryReviewTab({ model, onPracticeSet, onOpenVocabulary }: Props) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Review</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          Practice words that need another look.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--pl-muted)]">
            Due now
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{model.dueCount}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--pl-muted)]">
            Fragile
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{model.fragileCount}</p>
        </div>
      </div>

      {model.items.length === 0 ? (
        <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-6 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 text-[var(--pl-purple)]" />
          <h2 className="mt-3 text-lg font-extrabold">You&apos;re caught up</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">
            Learn more vocabulary topics, then come back here for review practice.
          </p>
          {onOpenVocabulary ? (
            <button
              type="button"
              onClick={onOpenVocabulary}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white hover:bg-[var(--pl-teal-hover)]"
            >
              <BookOpen className="h-4 w-4" />
              Browse Learn
            </button>
          ) : null}
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold tracking-tight">Words to review</h2>
          <ul className="mt-4 space-y-2">
            {model.items.map((item) => (
              <li
                key={item.wordId}
                className="flex items-center gap-3 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2.5"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white">
                  <NextImage
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold capitalize">{item.lemma}</p>
                  <p className="truncate text-xs font-semibold text-[var(--pl-muted)]">
                    {item.reasonLabel} · {item.setTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPracticeSet(item.setId)}
                  className="shrink-0 rounded-xl bg-[var(--pl-teal)] px-3 py-2 text-xs font-extrabold text-white hover:bg-[var(--pl-teal-hover)]"
                >
                  Practice
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
