"use client";

import NextImage from "next/image";
import { clsx } from "clsx";
import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";
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

type VocabHubId = "animals" | "school" | "body" | "jobs" | "food";
type LearnVocabView = "top" | VocabHubId;

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
  muted: boolean;
  studyCarePending?: boolean;
  onOpenVocabularySet: (id: VocabSetId) => void;
};

const setCardClass =
  "w-full rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 text-left transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-4";

export function LearnRoom({
  playerLevel,
  muted,
  studyCarePending = false,
  onOpenVocabularySet,
}: Props) {
  const [view, setView] = useState<LearnVocabView>("top");
  const hubView = view === "top" ? null : view;
  const hubHeading = hubView ? HUB_HEADINGS[hubView] : null;

  function openSet(id: VocabSetId) {
    const setUnlockId = `vocab_set:${id}` as const;
    if (!isUnlockAvailable(setUnlockId, playerLevel)) {
      playSfx("wrong", muted);
      return;
    }
    playSfx("tap", muted);
    onOpenVocabularySet(id);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-extrabold text-kid-ink">
          {hubHeading?.title ?? "Learn"}
        </h1>
        <p className="text-base font-semibold text-kid-ink/85">
          {hubHeading?.subtitle ?? "Vocabulary sets — tap a set or category to start learning."}
        </p>
      </div>

      {studyCarePending ? (
        <KidPanel className="border-sky-800 bg-sky-50 py-3 text-center">
          <p className="text-sm font-bold text-sky-950">
            Complete a set below to study with your pet!
          </p>
        </KidPanel>
      ) : null}

      {view === "top" ?
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VOCAB_TOP_MENU.map((entry) => {
            if (entry.kind === "hub") {
              const hubLocked = !isUnlockAvailable("vocab_sets_menu", playerLevel);
              return (
                <li key={entry.hubId}>
                  <button
                    type="button"
                    aria-label={
                      hubLocked ?
                        `${entry.label} — unlocks at level ${minLevelForUnlock("vocab_sets_menu")}`
                      : `${entry.label} vocabulary categories`
                    }
                    className={clsx(setCardClass, hubLocked && "cursor-not-allowed opacity-55 grayscale")}
                    onClick={() => {
                      if (hubLocked) {
                        playSfx("wrong", muted);
                        return;
                      }
                      playSfx("tap", muted);
                      setView(entry.hubId);
                    }}
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                      <NextImage
                        src={entry.coverImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="mt-3 text-center text-lg font-bold text-kid-ink">{entry.label}</p>
                    <p className="mt-1 text-center text-sm font-semibold text-kid-ink/75">
                      {entry.subtitle}
                    </p>
                    {hubLocked ? (
                      <p className="mt-1 text-center text-sm font-bold text-kid-ink/80">
                        Level {minLevelForUnlock("vocab_sets_menu")} to unlock
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            }
            const setUnlockId = `vocab_set:${entry.id}` as const;
            const setLocked = !isUnlockAvailable(setUnlockId, playerLevel);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-label={
                    setLocked ?
                      `${entry.label} — unlocks at level ${minLevelForUnlock(setUnlockId)}`
                    : `${entry.label} vocabulary set`
                  }
                  className={clsx(setCardClass, setLocked && "cursor-not-allowed opacity-55 grayscale")}
                  onClick={() => openSet(entry.id)}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                    <NextImage
                      src={vocabSetCoverImageSrc(entry.id)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 text-center text-lg font-bold text-kid-ink">{entry.label}</p>
                  {setLocked ? (
                    <p className="mt-1 text-center text-sm font-bold text-kid-ink/80">
                      Level {minLevelForUnlock(setUnlockId)} to unlock
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      : <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HUB_SET_MENUS[view].map((entry) => {
            const setUnlockId = `vocab_set:${entry.id}` as const;
            const setLocked = !isUnlockAvailable(setUnlockId, playerLevel);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-label={
                    setLocked ?
                      `${entry.label} — unlocks at level ${minLevelForUnlock(setUnlockId)}`
                    : `${entry.label} vocabulary set`
                  }
                  className={clsx(setCardClass, setLocked && "cursor-not-allowed opacity-55 grayscale")}
                  onClick={() => openSet(entry.id)}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border-2 border-kid-ink/50 bg-white">
                    <NextImage
                      src={vocabSetCoverImageSrc(entry.id)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 text-center text-lg font-bold text-kid-ink">{entry.label}</p>
                  {setLocked ? (
                    <p className="mt-1 text-center text-sm font-bold text-kid-ink/80">
                      Level {minLevelForUnlock(setUnlockId)} to unlock
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      }

      {hubView ?
        <div className="flex justify-center pt-2">
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => {
              playSfx("tap", muted);
              setView("top");
            }}
          >
            Back
          </KidButton>
        </div>
      : null}
    </div>
  );
}
