"use client";

import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { useBoundsOverride, useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { WKE_TERRAIN_ASSET_GROUPS } from "@/lib/topdown/preview-board-game-terrain";
import { WKE_TERRAIN_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

const ATLAS_CARD_PX = 96;

const GROUP_BORDER: Record<string, string> = {
  Grass: "border-emerald-600/50",
  Sand: "border-amber-600/50",
  Snow: "border-sky-400/50",
  Water: "border-blue-600/50",
  Stone: "border-stone-500/50",
};

function TerrainAssetCard({ assetId, label }: { assetId: string; label: string }) {
  const { openEditor } = useBoundsOverride();
  const fallback =
    WKE_TERRAIN_SPRITE_ATLAS.assets[assetId as keyof typeof WKE_TERRAIN_SPRITE_ATLAS.assets];
  const bounds = useResolvedSpriteBounds("wke-terrain", assetId, fallback);
  if (!fallback) return null;

  return (
    <KidPanel
      className={clsx(
        "flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-colors hover:bg-kid-surface-muted/60",
        GROUP_BORDER[label] ?? "border-kid-ink/30",
      )}
      onDoubleClick={() =>
        openEditor({
          atlasId: "wke-terrain",
          assetId,
          label: assetId,
        })
      }
      title="Double-click to edit sprite bounds"
    >
      <div
        className="overflow-hidden rounded-lg bg-[#3a3a3a]"
        style={{ width: ATLAS_CARD_PX, height: ATLAS_CARD_PX }}
      >
        <TopDownSprite
          atlas={WKE_TERRAIN_SPRITE_ATLAS}
          bounds={bounds}
          fillCell
          fillScale={ATLAS_CARD_PX / bounds.sw}
          alt=""
        />
      </div>
      <p className="font-mono text-[0.6rem] font-bold leading-tight text-kid-ink/75">{assetId}</p>
    </KidPanel>
  );
}

export function WkeTerrainAtlasSection() {
  return (
    <section id="wke-atlas" className="scroll-mt-6 space-y-6">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">Terrain atlas</h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          WKE example terrain sheet — left 4×7 grid. <strong>Double-click</strong> a card to
          tune crop bounds, walk surface, lip split line, and stacked preview.
        </p>
      </header>

      {WKE_TERRAIN_ASSET_GROUPS.map((group) => (
        <div key={group.label} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">{group.label}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {group.assetIds.map((assetId) => (
              <TerrainAssetCard key={assetId} assetId={assetId} label={group.label} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
