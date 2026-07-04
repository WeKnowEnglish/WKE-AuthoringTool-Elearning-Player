"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  useBoundsOverride,
  useResolvedSpriteBounds,
} from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { PREVIEW_ATLAS_CARD_PX } from "@/lib/topdown/preview-mock-data";
import { spriteScaleToWidth, type SpriteCategory, type SpriteFrameDef } from "@/lib/topdown";

const CATEGORY_BORDER: Record<SpriteCategory, string> = {
  grass: "border-emerald-600/50",
  soil: "border-amber-800/50",
  plant: "border-lime-600/50",
  item: "border-sky-600/50",
  weed: "border-purple-600/50",
  fence: "border-orange-600/50",
};

type Props = {
  frame: SpriteFrameDef;
};

export function SpriteAtlasCard({ frame }: Props) {
  const { openEditor } = useBoundsOverride();
  const bounds = useResolvedSpriteBounds("garden", frame.id, frame);
  const isOverridden = bounds.sx !== frame.sx || bounds.sy !== frame.sy || bounds.sw !== frame.sw || bounds.sh !== frame.sh;

  return (
    <KidPanel
      className={clsx(
        "flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-colors hover:bg-kid-surface-muted/60",
        CATEGORY_BORDER[frame.category],
        isOverridden && "ring-2 ring-sky-500/70",
      )}
      onDoubleClick={() =>
        openEditor({
          atlasId: "garden",
          assetId: frame.id,
          label: frame.label,
        })
      }
      title="Double-click to edit bounds"
    >
      <TopDownSprite
        bounds={bounds}
        scale={spriteScaleToWidth(bounds, PREVIEW_ATLAS_CARD_PX)}
        alt={frame.label}
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-extrabold text-kid-ink">{frame.label}</p>
        <p className="font-mono text-[0.65rem] text-kid-ink/70">{frame.id}</p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/60">
          sx {bounds.sx}, sy {bounds.sy}
        </p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/60">
          sw {bounds.sw}, sh {bounds.sh}
        </p>
        {isOverridden ?
          <p className="text-[0.6rem] font-bold text-sky-700">Edited (session)</p>
        : null}
      </div>
    </KidPanel>
  );
}
