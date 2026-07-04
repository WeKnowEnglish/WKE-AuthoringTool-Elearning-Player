"use client";

import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { GARDEN_ITEM_LABELS } from "@/lib/garden/rewards";
import { GARDEN_ITEM_SPRITES, spriteScaleToWidth } from "@/lib/topdown";
import { MOCK_HUD, PREVIEW_TOOL_ICON_PX } from "@/lib/topdown/preview-mock-data";

export function MockGardenHud() {
  const letterEntries = Object.entries(MOCK_HUD.letters).sort(([a], [b]) =>
    a.localeCompare(b),
  );

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
            <p className="text-lg font-extrabold text-kid-ink">{MOCK_HUD.seedCount}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
            Letters
          </p>
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
        </div>
      </div>

      <div className="mt-3 border-t-2 border-kid-ink/15 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">Items</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-kid-ink bg-sky-50 px-2 py-0.5 text-sm font-bold text-kid-ink">
            <TopDownSprite
              bounds={GARDEN_ITEM_SPRITES.watering_can}
              scale={spriteScaleToWidth(GARDEN_ITEM_SPRITES.watering_can, PREVIEW_TOOL_ICON_PX)}
              alt=""
            />
            {GARDEN_ITEM_LABELS.watering_can}
            <span className="text-kid-ink/70">
              · {MOCK_HUD.wateringCanReady ? "Ready" : "Cooldown"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-kid-ink bg-amber-50 px-2 py-0.5 text-sm font-bold text-kid-ink">
            <TopDownSprite
              bounds={GARDEN_ITEM_SPRITES.fertilizer}
              scale={spriteScaleToWidth(GARDEN_ITEM_SPRITES.fertilizer, PREVIEW_TOOL_ICON_PX)}
              alt=""
            />
            {GARDEN_ITEM_LABELS.fertilizer}
            <span className="text-kid-ink/70">
              · {MOCK_HUD.fertilizerReady ? "Ready" : MOCK_HUD.fertilizerCooldownLabel}
            </span>
          </span>
        </div>
      </div>

      <div className="mt-3 border-t-2 border-kid-ink/15 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/70">
          Spelling · Level {MOCK_HUD.spellingLevel}
        </p>
        <p className="text-sm font-extrabold text-kid-ink">
          {MOCK_HUD.spellingTitle}{" "}
          <span className="font-semibold text-kid-ink/70">
            ({MOCK_HUD.spellingProgress})
          </span>
        </p>
      </div>
    </KidPanel>
  );
}
