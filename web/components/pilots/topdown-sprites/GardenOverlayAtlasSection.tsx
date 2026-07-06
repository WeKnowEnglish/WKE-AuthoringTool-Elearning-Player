"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import {
  useBoundsOverride,
  useResolvedSpriteBounds,
} from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  GARDEN_OVERLAY_PICKER_FRAMES,
  GARDEN_SPRITE_ATLAS,
  type GardenOverlayPickerFrameId,
} from "@/lib/topdown/garden-sprite-atlas";
import { spriteScaleToFit } from "@/lib/topdown/sprite-utils";
import type { SpriteCategory } from "@/lib/topdown/types";

const ATLAS_CARD_PX = 96;

const CATEGORY_BORDER: Record<SpriteCategory, string> = {
  grass: "border-emerald-600/50",
  soil: "border-amber-800/50",
  plant: "border-lime-600/50",
  item: "border-sky-600/50",
  weed: "border-purple-600/50",
  fence: "border-orange-600/50",
};

function OverlayAssetCard({ assetId }: { assetId: GardenOverlayPickerFrameId }) {
  const { openEditor } = useBoundsOverride();
  const frame = GARDEN_OVERLAY_PICKER_FRAMES.find((entry) => entry.id === assetId);
  if (!frame) return null;
  const fallback = { sx: frame.sx, sy: frame.sy, sw: frame.sw, sh: frame.sh };
  const bounds = useResolvedSpriteBounds("garden", assetId, fallback);

  return (
    <KidPanel
      className={clsx(
        "flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-colors hover:bg-kid-surface-muted/60",
        CATEGORY_BORDER[frame.category],
      )}
      onDoubleClick={() =>
        openEditor({
          atlasId: "garden",
          assetId,
          label: frame.label,
        })
      }
      title="Double-click to edit sprite bounds"
    >
      <div
        className="flex items-center justify-center overflow-hidden rounded-lg"
        style={{ width: ATLAS_CARD_PX, height: ATLAS_CARD_PX }}
      >
        <TopDownSprite
          atlas={GARDEN_SPRITE_ATLAS}
          bounds={bounds}
          scale={spriteScaleToFit(bounds, ATLAS_CARD_PX)}
          knockOutGutter
          alt={frame.label}
        />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-extrabold text-kid-ink">{frame.label}</p>
        <p className="font-mono text-[0.65rem] text-kid-ink/70">{assetId}</p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/60">
          {bounds.sx}, {bounds.sy} · {bounds.sw}×{bounds.sh}
        </p>
        <p className="text-[0.6rem] font-bold text-kid-ink/50">Double-click to edit</p>
      </div>
    </KidPanel>
  );
}

export function GardenOverlayAtlasSection() {
  return (
    <section id="overlays" className="scroll-mt-6 space-y-4">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Tools &amp; weed monster
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          Crops from <code className="rounded bg-kid-ink/10 px-1">language_garden_sheet.png</code>
          — watering can, fertilizer, and weed monster sprite. <strong>Double-click</strong> a card to tune
          crop bounds and stacked preview.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GARDEN_OVERLAY_PICKER_FRAMES.map((frame) => (
          <OverlayAssetCard key={frame.id} assetId={frame.id} />
        ))}
      </div>
    </section>
  );
}
