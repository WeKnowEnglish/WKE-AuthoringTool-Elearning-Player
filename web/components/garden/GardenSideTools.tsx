"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { formatFertilizerCooldown } from "@/lib/garden/fertilizer";
import { formatWateringCanCooldown } from "@/lib/garden/watering-can";
import type { GardenItemId } from "@/lib/garden/types";
import { GARDEN_ITEM_SPRITES, spriteScaleToWidth } from "@/lib/topdown";

/** Compact tool button — fills most of the card so the sprite reads clearly. */
const GARDEN_TOOL_CARD_PX = 52;
const GARDEN_TOOL_ICON_PX = 44;

type ToolSquareProps = {
  label: string;
  itemId: GardenItemId;
  active?: boolean;
  pressed?: boolean;
  activeClassName?: string;
  disabled?: boolean;
  badge?: string | null;
  onClick: () => void;
};

function GardenToolSquare({
  label,
  itemId,
  active,
  pressed,
  activeClassName,
  disabled,
  badge,
  onClick,
}: ToolSquareProps) {
  const sprite = GARDEN_ITEM_SPRITES[itemId];
  const spriteScale = spriteScaleToWidth(sprite, GARDEN_TOOL_ICON_PX);

  return (
    <button
      type="button"
      className={clsx(
        "relative flex shrink-0 items-center justify-center rounded-xl border-4 border-kid-ink transition-transform [touch-action:manipulation]",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink",
        active ?
          activeClassName
        : "bg-transparent text-kid-ink hover:bg-kid-surface-muted/40 active:scale-95",
        disabled && "cursor-not-allowed opacity-55 active:scale-100",
      )}
      style={{ width: GARDEN_TOOL_CARD_PX, height: GARDEN_TOOL_CARD_PX }}
      aria-label={label}
      {...(pressed !== undefined ? { "aria-pressed": pressed } : {})}
      disabled={disabled}
      onClick={onClick}
    >
      <TopDownSprite bounds={sprite} scale={spriteScale} knockOutGutter alt="" />
      {badge ?
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 rounded-md border-2 border-kid-ink bg-white px-1 py-px text-[0.5rem] font-extrabold leading-none tabular-nums text-kid-ink">
          {badge}
        </span>
      : null}
    </button>
  );
}

type Props = {
  wateringCanUnlocked: boolean;
  fertilizerUnlocked: boolean;
  wateringCanReady: boolean;
  fertilizerReady: boolean;
  wateringCanCooldownMs: number;
  fertilizerCooldownMs: number;
  waterMode: boolean;
  fertilizeMode: boolean;
  onToggleWater: () => void;
  onToggleFertilize: () => void;
};

export function GardenSideTools({
  wateringCanUnlocked,
  fertilizerUnlocked,
  wateringCanReady,
  fertilizerReady,
  wateringCanCooldownMs,
  fertilizerCooldownMs,
  waterMode,
  fertilizeMode,
  onToggleWater,
  onToggleFertilize,
}: Props) {
  const toolCount =
    (wateringCanUnlocked ? 1 : 0) + (fertilizerUnlocked ? 1 : 0);
  if (toolCount === 0) return null;

  const waterBadge =
    !waterMode && !wateringCanReady && wateringCanCooldownMs > 0 ?
      formatWateringCanCooldown(wateringCanCooldownMs)
    : null;
  const fertilizerBadge =
    !fertilizeMode && !fertilizerReady && fertilizerCooldownMs > 0 ?
      formatFertilizerCooldown(fertilizerCooldownMs)
    : null;

  const waterLabel =
    waterMode ? "Watering mode on. Tap to turn off."
    : wateringCanReady ? "Watering can. Tap to activate."
    : `Watering can. Recharges in ${formatWateringCanCooldown(wateringCanCooldownMs)}.`;

  const fertilizerLabel =
    fertilizeMode ? "Fertilize mode on. Tap to turn off."
    : fertilizerReady ? "Fertilizer. Tap to activate."
    : `Fertilizer. Recharges in ${formatFertilizerCooldown(fertilizerCooldownMs)}.`;

  return (
    <div
      className="flex flex-wrap justify-center gap-2"
      role="toolbar"
      aria-label="Garden tools"
    >
      {wateringCanUnlocked ?
        <GardenToolSquare
          label={waterLabel}
          itemId="watering_can"
          active={waterMode}
          pressed={waterMode}
          activeClassName="bg-sky-500 text-white ring-2 ring-sky-300"
          disabled={!wateringCanReady && !waterMode}
          badge={waterBadge}
          onClick={onToggleWater}
        />
      : null}
      {fertilizerUnlocked ?
        <GardenToolSquare
          label={fertilizerLabel}
          itemId="fertilizer"
          active={fertilizeMode}
          pressed={fertilizeMode}
          activeClassName="bg-amber-500 text-white ring-2 ring-amber-300"
          disabled={!fertilizerReady && !fertilizeMode}
          badge={fertilizerBadge}
          onClick={onToggleFertilize}
        />
      : null}
    </div>
  );
}
