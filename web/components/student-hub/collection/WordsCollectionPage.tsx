"use client";

import { clsx } from "clsx";
import { useCallback, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  getNextWordTierDef,
  getTierDefForWord,
  getUpgradePreview,
  getWordDisplayInfo,
  getWordTierDef,
  listCollectedWords,
  upgradeWord,
  type CollectedWord,
} from "@/lib/word-collection";
import { getRewards } from "@/lib/progress/rewards";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

const TIER_RING: Record<string, string> = {
  bronze: "border-amber-700 bg-amber-50",
  silver: "border-slate-400 bg-slate-50",
  gold: "border-yellow-500 bg-yellow-50",
  platinum: "border-violet-400 bg-violet-50",
  diamond: "border-sky-500 bg-sky-50",
};

type Props = {
  muted: boolean;
  collectionUiKey: number;
  onEconomyChange?: () => void;
};

function WordDetailSheet({
  word,
  muted,
  onClose,
  onUpgraded,
}: {
  word: CollectedWord;
  muted: boolean;
  onClose: () => void;
  onUpgraded: () => void;
}) {
  const display = getWordDisplayInfo(word.wordId);
  const tierDef = getWordTierDef(word.tier);
  const preview = getUpgradePreview(word.wordId);
  const nextTierDef = preview.nextTier ? getNextWordTierDef(word.tier) : null;
  const gold = getRewards().gold;

  const onUpgrade = () => {
    const result = upgradeWord(word.wordId);
    if (result.ok) {
      playSfx("correct", muted);
      onUpgraded();
      onClose();
    } else {
      playSfx("wrong", muted);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[82] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${display.displayLabel} details`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <KidPanel className="max-h-[85dvh] w-full max-w-md overflow-y-auto border-4 border-kid-ink p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-extrabold text-kid-ink">{display.displayLabel}</p>
            {display.pos ?
              <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/60">
                {display.pos}
              </p>
            : null}
          </div>
          <KidButton type="button" variant="secondary" className="!min-h-9 shrink-0" onClick={onClose}>
            Close
          </KidButton>
        </div>
        <p className="mt-3 text-sm font-semibold text-kid-ink/85">
          Copies collected: <span className="tabular-nums font-extrabold">{word.count}</span>
        </p>
        <p className="mt-1 text-sm font-bold text-kid-ink">
          Tier {word.tier}
          {tierDef ? ` · ${tierDef.label}` : ""}
        </p>
        {tierDef ?
          <p className="mt-2 rounded-lg border-2 border-kid-ink/20 bg-kid-panel/60 px-3 py-2 text-sm font-semibold text-kid-ink/90">
            {tierDef.bonus.description}
          </p>
        : null}
        {preview.atMaxTier ?
          <p className="mt-4 text-sm font-extrabold text-emerald-800">Max tier reached!</p>
        : nextTierDef ?
          <div className="mt-4 space-y-2 border-t-2 border-kid-ink/15 pt-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/80">
              Next: {nextTierDef.label} (tier {nextTierDef.tier})
            </p>
            <p className="text-sm font-semibold text-kid-ink/85">
              Need {nextTierDef.minCount} copies
              {preview.missingCount > 0 ?
                ` — ${preview.missingCount} more to go`
              : " — ready!"}
            </p>
            <p className="text-sm font-semibold text-kid-ink/85">
              Cost: {nextTierDef.goldCost} gold (you have {gold})
            </p>
            <KidButton
              type="button"
              variant="accent"
              className="w-full"
              disabled={!preview.canUpgrade}
              onClick={onUpgrade}
            >
              {preview.canUpgrade ? `Upgrade for ${preview.goldCost} gold` : "Not ready yet"}
            </KidButton>
          </div>
        : null}
      </KidPanel>
    </div>
  );
}

export function WordsCollectionPage({ muted, collectionUiKey, onEconomyChange }: Props) {
  const hydrated = useClientHydrated();
  const [selected, setSelected] = useState<CollectedWord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  void collectionUiKey;
  void refreshKey;

  const words = useMemo(() => {
    if (!hydrated) return [];
    return listCollectedWords();
  }, [hydrated, collectionUiKey, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    onEconomyChange?.();
  }, [onEconomyChange]);

  if (!hydrated) {
    return (
      <KidPanel className="animate-pulse py-12">
        <p className="text-center text-sm font-semibold text-kid-ink/70">Loading words…</p>
      </KidPanel>
    );
  }

  if (words.length === 0) {
    return (
      <KidPanel className="py-8 text-center">
        <p className="text-lg font-extrabold text-kid-ink">No words yet</p>
        <p className="mt-2 text-sm font-semibold text-kid-ink/80">
          Explore the world to find word loot. Collected words appear here so you can upgrade them
          over time.
        </p>
      </KidPanel>
    );
  }

  return (
    <>
      <p className="shrink-0 text-sm font-semibold text-kid-ink/80">
        {words.length} word{words.length === 1 ? "" : "s"} in your book. Tap one to upgrade.
      </p>
      <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3">
          {words.map((w) => {
            const display = getWordDisplayInfo(w.wordId);
            const tierDef = getTierDefForWord(w.wordId);
            const ring = tierDef ? TIER_RING[tierDef.visualTier] ?? TIER_RING.bronze : TIER_RING.bronze;
            return (
              <li key={w.wordId}>
                <button
                  type="button"
                  className={clsx(
                    "flex w-full flex-col rounded-2xl border-4 p-3 text-left transition-transform [touch-action:manipulation] active:scale-[0.98]",
                    ring,
                  )}
                  onClick={() => {
                    playSfx("tap", muted);
                    setSelected(w);
                  }}
                >
                  <span className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/60">
                    Tier {w.tier}
                  </span>
                  <span className="mt-1 text-lg font-extrabold leading-tight text-kid-ink">
                    {display.displayLabel}
                  </span>
                  <span className="mt-2 text-sm font-bold tabular-nums text-kid-ink/80">
                    ×{w.count} collected
                  </span>
                </button>
              </li>
            );
          })}
        </div>
      </ul>
      {selected ?
        <WordDetailSheet
          word={selected}
          muted={muted}
          onClose={() => setSelected(null)}
          onUpgraded={refresh}
        />
      : null}
    </>
  );
}
