"use client";

import NextImage from "next/image";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Lock } from "lucide-react";
import { resumeScreenIndexForSet } from "@/lib/primary/vocab-continue";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import {
  ANIMALS_VOCAB_SET_MENU,
  BODY_VOCAB_SET_MENU,
  FOOD_VOCAB_SET_MENU,
  JOBS_VOCAB_SET_MENU,
  SCHOOL_VOCAB_SET_MENU,
  VOCAB_TOP_MENU,
  vocabSetCoverImageSrc,
  type VocabSetId,
} from "@/lib/vocabulary-templates";
import type { VocabHubId } from "@/lib/worlds/types";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";

type VocabView = "top" | VocabHubId;

const HUB_SET_MENUS: Record<VocabHubId, { id: VocabSetId; label: string }[]> = {
  food: FOOD_VOCAB_SET_MENU,
  animals: ANIMALS_VOCAB_SET_MENU,
  school: SCHOOL_VOCAB_SET_MENU,
  body: BODY_VOCAB_SET_MENU,
  jobs: JOBS_VOCAB_SET_MENU,
};

const HUB_HEADINGS: Record<VocabHubId, { title: string; subtitle: string }> = {
  food: {
    title: "Food",
    subtitle: "Pick breakfast, fruit, meals, or snacks.",
  },
  animals: {
    title: "Animals",
    subtitle: "Pick a category — wild, pets, sea, or farm.",
  },
  school: {
    title: "School",
    subtitle: "Pick supplies and subjects, or school activities.",
  },
  body: {
    title: "Body Parts",
    subtitle: "Pick head and face, or arms, legs, and inside.",
  },
  jobs: {
    title: "Jobs",
    subtitle: "Pick community jobs or more jobs.",
  },
};

type Props = {
  playerLevel: number;
  onOpenSet?: (id: VocabSetId, label: string) => void;
};

export function PrimaryVocabularyTab({ playerLevel, onOpenSet }: Props) {
  const hydrated = useClientHydrated();
  const [view, setView] = useState<VocabView>("top");
  const hubView = view === "top" ? null : view;
  const heading = hubView
    ? HUB_HEADINGS[hubView]
    : {
        title: "Vocabulary",
        subtitle: "Choose a topic to learn new words.",
      };

  function openSet(id: VocabSetId, label: string) {
    const setUnlockId = `vocab_set:${id}` as const;
    if (!isUnlockAvailable(setUnlockId, playerLevel)) return;
    onOpenSet?.(id, label);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {hubView && (
            <button
              type="button"
              onClick={() => setView("top")}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--pl-purple)] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              All topics
            </button>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {heading.title}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
            {heading.subtitle}
          </p>
        </div>
      </header>

      {view === "top" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VOCAB_TOP_MENU.map((entry) => {
            if (entry.kind === "hub") {
              const hubLocked = !isUnlockAvailable("vocab_sets_menu", playerLevel);
              return (
                <li key={entry.hubId}>
                  <TopicCard
                    label={entry.label}
                    subtitle={entry.subtitle}
                    imageSrc={entry.coverImageUrl}
                    locked={hubLocked}
                    unlockLevel={minLevelForUnlock("vocab_sets_menu")}
                    onClick={() => {
                      if (hubLocked) return;
                      setView(entry.hubId);
                    }}
                  />
                </li>
              );
            }

            const setUnlockId = `vocab_set:${entry.id}` as const;
            const setLocked = !isUnlockAvailable(setUnlockId, playerLevel);
            return (
              <li key={entry.id}>
                <TopicCard
                  label={entry.label}
                  imageSrc={vocabSetCoverImageSrc(entry.id)}
                  locked={setLocked}
                  unlockLevel={minLevelForUnlock(setUnlockId)}
                  continueLabel={
                    hydrated && !setLocked && resumeScreenIndexForSet(entry.id) > 0
                      ? "Continue"
                      : null
                  }
                  onClick={() => openSet(entry.id, entry.label)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_SET_MENUS[view].map((entry) => {
            const setUnlockId = `vocab_set:${entry.id}` as const;
            const setLocked = !isUnlockAvailable(setUnlockId, playerLevel);
            return (
              <li key={entry.id}>
                <TopicCard
                  label={entry.label}
                  imageSrc={vocabSetCoverImageSrc(entry.id)}
                  locked={setLocked}
                  unlockLevel={minLevelForUnlock(setUnlockId)}
                  continueLabel={
                    hydrated && !setLocked && resumeScreenIndexForSet(entry.id) > 0
                      ? "Continue"
                      : null
                  }
                  onClick={() => openSet(entry.id, entry.label)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TopicCard({
  label,
  subtitle,
  imageSrc,
  locked,
  unlockLevel,
  continueLabel,
  onClick,
}: {
  label: string;
  subtitle?: string;
  imageSrc: string;
  locked: boolean;
  unlockLevel: number;
  continueLabel?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      aria-label={
        locked ? `${label} — unlocks at level ${unlockLevel}` : `${label} vocabulary`
      }
      onClick={onClick}
      className={`group flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition ${
        locked
          ? "cursor-not-allowed opacity-55"
          : "hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
      }`}
    >
      <div className="relative aspect-[16/10] w-full bg-[var(--pl-purple-soft)]">
        <NextImage
          src={imageSrc}
          alt=""
          fill
          className={`object-cover ${locked ? "grayscale" : ""}`}
          unoptimized
        />
        {locked && (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/25">
            <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-[var(--pl-ink)]">
              <Lock className="h-3.5 w-3.5" />
              Level {unlockLevel}
            </span>
          </span>
        )}
        {!locked && continueLabel ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--pl-teal)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            {continueLabel}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="text-base font-extrabold text-[var(--pl-ink)]">{label}</p>
          {subtitle && (
            <p className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">{subtitle}</p>
          )}
        </div>
        {!locked && (
          <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pl-muted)] transition group-hover:text-[var(--pl-purple)]" />
        )}
      </div>
    </button>
  );
}
