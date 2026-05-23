"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { AchievementsCollectionPage } from "@/components/student-hub/collection/AchievementsCollectionPage";
import { CollectionSubNav } from "@/components/student-hub/collection/CollectionSubNav";
import { ScenesCollectionPage } from "@/components/student-hub/collection/ScenesCollectionPage";
import { StickersCollectionPage } from "@/components/student-hub/collection/StickersCollectionPage";
import {
  parseCollectionPageId,
  type CollectionPageId,
} from "@/components/student-hub/collection/types";
import { WordsCollectionPage } from "@/components/student-hub/collection/WordsCollectionPage";

type Props = {
  muted: boolean;
  experience: number;
  dailyQuestUiKey: number;
  explorationUiKey: number;
  initialPage?: string | null;
  onRewardsChange?: () => void;
  className?: string;
};

export function CollectionBookRoom({
  muted,
  experience,
  dailyQuestUiKey,
  explorationUiKey,
  initialPage,
  onRewardsChange,
  className,
}: Props) {
  const [page, setPage] = useState<CollectionPageId>(() => parseCollectionPageId(initialPage));
  const [wordsUiKey, setWordsUiKey] = useState(0);

  const bumpWords = () => {
    setWordsUiKey((k) => k + 1);
    onRewardsChange?.();
  };

  return (
    <div className={clsx("flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden", className)}>
      <div className="shrink-0 px-0.5">
        <h1 className="text-center text-xl font-extrabold text-kid-ink sm:text-2xl">Collection</h1>
        <p className="mt-0.5 text-center text-xs font-semibold text-kid-ink/75 sm:text-sm">
          Stickers, words, scenes, and awards
        </p>
        <div className="mt-2">
          <CollectionSubNav page={page} muted={muted} onPageChange={setPage} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-0.5">
        {page === "stickers" ?
          <StickersCollectionPage
            muted={muted}
            dailyQuestUiKey={dailyQuestUiKey}
            onRewardsChange={onRewardsChange}
          />
        : page === "scenes" ?
          <ScenesCollectionPage
            muted={muted}
            dailyQuestUiKey={dailyQuestUiKey}
            onRewardsChange={onRewardsChange}
            className="min-h-0 flex-1"
          />
        : page === "words" ?
          <WordsCollectionPage
            muted={muted}
            collectionUiKey={wordsUiKey}
            onEconomyChange={bumpWords}
          />
        : <AchievementsCollectionPage
            experience={experience}
            explorationUiKey={explorationUiKey}
            onRewardsChange={onRewardsChange}
          />
        }
      </div>
    </div>
  );
}
