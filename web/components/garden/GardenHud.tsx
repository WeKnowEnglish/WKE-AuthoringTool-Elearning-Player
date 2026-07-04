"use client";

import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { GardenSnapshotV1 } from "@/lib/garden";
import { GARDEN_ITEM_EMOJI, GARDEN_ITEM_LABELS } from "@/lib/garden/rewards";
import { getGardenSpellingLevel, spellingLevelProgress } from "@/lib/garden/spelling-levels";
import {
  formatFertilizerCooldown,
  hasFertilizerUnlocked,
  fertilizerCooldownRemainingMs,
} from "@/lib/garden/fertilizer";
import {
  formatWateringCanCooldown,
  hasWateringCanUnlocked,
  wateringCanCooldownRemainingMs,
} from "@/lib/garden/watering-can";

type Props = {
  snapshot: GardenSnapshotV1;
  now?: number;
};

export function GardenHud({ snapshot, now = Date.now() }: Props) {
  const level = getGardenSpellingLevel(snapshot.spellingLevel);
  const spellProgress = spellingLevelProgress(
    snapshot.spellingLevel,
    snapshot.spelledAtLevel,
  );

  const letterEntries = Object.entries(snapshot.letters)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const wateringCanUnlocked = hasWateringCanUnlocked(snapshot);
  const fertilizerUnlocked = hasFertilizerUnlocked(snapshot);
  const wateringCanCooldownMs = wateringCanCooldownRemainingMs(snapshot, now);
  const fertilizerCooldownMs = fertilizerCooldownRemainingMs(snapshot, now);

  return (
    <KidPanel className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            🌱
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
              Seeds
            </p>
            <p className="text-lg font-extrabold text-kid-ink">
              {snapshot.seedPouch.length}
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
            Letters
          </p>
          {letterEntries.length > 0 ?
            <div className="mt-1 flex flex-wrap gap-1">
              {letterEntries.map(([ch, count]) => (
                <span
                  key={ch}
                  className="inline-flex min-w-[2rem] items-center justify-center rounded-md border-2 border-kid-ink bg-white px-1.5 py-0.5 text-sm font-extrabold text-kid-ink"
                >
                  {ch}
                  {count > 1 ?
                    <span className="ml-0.5 text-[0.65rem] text-kid-ink/70">×{count}</span>
                  : null}
                </span>
              ))}
            </div>
          : <p className="text-sm font-semibold text-kid-ink/60">Harvest crops to collect letters</p>
          }
        </div>
      </div>
      {wateringCanUnlocked || fertilizerUnlocked ?
        <div className="mt-3 border-t-2 border-kid-ink/15 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">Items</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {wateringCanUnlocked ?
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-kid-ink bg-sky-50 px-2 py-0.5 text-sm font-bold text-kid-ink">
                <span aria-hidden>{GARDEN_ITEM_EMOJI.watering_can}</span>
                {GARDEN_ITEM_LABELS.watering_can}
                <span className="text-kid-ink/70">
                  · {wateringCanCooldownMs > 0 ?
                    formatWateringCanCooldown(wateringCanCooldownMs)
                  : "Ready"}
                </span>
              </span>
            : null}
            {fertilizerUnlocked ?
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-kid-ink bg-amber-50 px-2 py-0.5 text-sm font-bold text-kid-ink">
                <span aria-hidden>{GARDEN_ITEM_EMOJI.fertilizer}</span>
                {GARDEN_ITEM_LABELS.fertilizer}
                <span className="text-kid-ink/70">
                  · {fertilizerCooldownMs > 0 ?
                    formatFertilizerCooldown(fertilizerCooldownMs)
                  : "Ready"}
                </span>
              </span>
            : null}
          </div>
        </div>
      : null}
      <div className="mt-3 border-t-2 border-kid-ink/15 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
          Spelling · Level {level.id}
        </p>
        <p className="text-sm font-extrabold text-kid-ink">
          {level.title}{" "}
          <span className="font-semibold text-kid-ink/70">
            ({spellProgress.spelled}/{spellProgress.total})
          </span>
        </p>
      </div>
    </KidPanel>
  );
}
