"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { KidButton } from "@/components/kid-ui/KidButton";
import { GARDEN_ITEM_SPRITES, spriteScaleToWidth } from "@/lib/topdown";
import { PREVIEW_TOOL_ICON_PX } from "@/lib/topdown/preview-mock-data";

type Props = {
  waterMode: boolean;
  fertilizeMode: boolean;
  onToggleWater: () => void;
  onToggleFertilize: () => void;
};

export function MockGardenToolBar({
  waterMode,
  fertilizeMode,
  onToggleWater,
  onToggleFertilize,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
        <KidButton
          variant={waterMode ? "primary" : "secondary"}
          className={clsx(
            "!min-h-12 w-full sm:max-w-xs",
            waterMode && "!bg-sky-500",
          )}
          onClick={onToggleWater}
          aria-pressed={waterMode}
        >
          <span className="inline-flex items-center gap-2">
            <TopDownSprite
              bounds={GARDEN_ITEM_SPRITES.watering_can}
              scale={spriteScaleToWidth(GARDEN_ITEM_SPRITES.watering_can, PREVIEW_TOOL_ICON_PX)}
              alt=""
            />
            {waterMode ? "Watering…" : "Water"}
          </span>
        </KidButton>
        <KidButton
          variant={fertilizeMode ? "primary" : "secondary"}
          className={clsx(
            "!min-h-12 w-full sm:max-w-xs",
            fertilizeMode && "!bg-amber-500",
          )}
          onClick={onToggleFertilize}
          aria-pressed={fertilizeMode}
        >
          <span className="inline-flex items-center gap-2">
            <TopDownSprite
              bounds={GARDEN_ITEM_SPRITES.fertilizer}
              scale={spriteScaleToWidth(GARDEN_ITEM_SPRITES.fertilizer, PREVIEW_TOOL_ICON_PX)}
              alt=""
            />
            {fertilizeMode ? "Fertilizing…" : "Fertilize"}
          </span>
        </KidButton>
      </div>
      <KidButton className="!min-h-12 w-full max-w-xs" variant="secondary" disabled>
        Spell a Word
      </KidButton>
    </div>
  );
}
