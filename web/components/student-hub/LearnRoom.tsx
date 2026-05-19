"use client";

import NextImage from "next/image";
import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";
import {
  VOCAB_SET_MENU,
  vocabSetCoverImageSrc,
  type VocabSetId,
} from "@/lib/vocabulary-templates";

type Props = {
  playerLevel: number;
  muted: boolean;
  studyCarePending?: boolean;
  onOpenVocabularySet: (id: VocabSetId) => void;
};

export function LearnRoom({
  playerLevel,
  muted,
  studyCarePending = false,
  onOpenVocabularySet,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-extrabold text-kid-ink">Learn</h1>
        <p className="text-base font-semibold text-kid-ink/85">
          Vocabulary sets — tap a set to start learning.
        </p>
      </div>

      {studyCarePending ? (
        <KidPanel className="border-sky-800 bg-sky-50 py-3 text-center">
          <p className="text-sm font-bold text-sky-950">
            Complete a set below to study with your pet!
          </p>
        </KidPanel>
      ) : null}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {VOCAB_SET_MENU.map((entry) => {
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
                className={clsx(
                  "w-full rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 text-left transition-transform [touch-action:manipulation] hover:bg-kid-surface-muted active:scale-[0.98] sm:p-4",
                  setLocked && "cursor-not-allowed opacity-55 grayscale",
                )}
                onClick={() => {
                  if (setLocked) {
                    playSfx("wrong", muted);
                    return;
                  }
                  onOpenVocabularySet(entry.id);
                }}
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
    </div>
  );
}
