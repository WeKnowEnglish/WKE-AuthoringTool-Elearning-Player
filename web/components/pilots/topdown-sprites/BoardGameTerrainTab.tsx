"use client";

import Image from "next/image";
import { BoardGameTerrainPreview } from "@/components/pilots/topdown-sprites/BoardGameTerrainPreview";
import { BoundsOverrideProvider } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { SeamlessMapsSection } from "@/components/pilots/topdown-sprites/SeamlessMapsSection";
import { SpriteBoundsEditorModal } from "@/components/pilots/topdown-sprites/SpriteBoundsEditorModal";
import { WkePathAtlasSection } from "@/components/pilots/topdown-sprites/WkePathAtlasSection";
import { WkeTerrainAtlasSection } from "@/components/pilots/topdown-sprites/WkeTerrainAtlasSection";
import { WKE_PATH_SPRITE_ATLAS, WKE_TERRAIN_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

export function BoardGameTerrainTab() {
  return (
    <BoundsOverrideProvider>
      <div className="flex flex-col gap-10">
        <details className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel p-4">
          <summary className="cursor-pointer text-sm font-bold text-kid-ink/80">
            View path source sheet
          </summary>
          <Image
            src={WKE_PATH_SPRITE_ATLAS.imageSrc}
            alt="WKE dirt-on-grass path sprite sheet"
            width={WKE_PATH_SPRITE_ATLAS.width}
            height={WKE_PATH_SPRITE_ATLAS.height}
            className="mt-3 h-auto w-full rounded-lg border-4 border-kid-ink/30"
          />
          <p className="mt-2 text-center font-mono text-xs text-kid-ink/60">
            {WKE_PATH_SPRITE_ATLAS.imageSrc} · {WKE_PATH_SPRITE_ATLAS.width}×
            {WKE_PATH_SPRITE_ATLAS.height}
          </p>
        </details>

        <WkePathAtlasSection />

        <details className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel p-4">
          <summary className="cursor-pointer text-sm font-bold text-kid-ink/80">
            View terrain source sheet
          </summary>
          <Image
            src={WKE_TERRAIN_SPRITE_ATLAS.imageSrc}
            alt="WKE example terrain sprite sheet"
            width={WKE_TERRAIN_SPRITE_ATLAS.width}
            height={WKE_TERRAIN_SPRITE_ATLAS.height}
            className="mt-3 h-auto w-full rounded-lg border-4 border-kid-ink/30"
          />
          <p className="mt-2 text-center font-mono text-xs text-kid-ink/60">
            {WKE_TERRAIN_SPRITE_ATLAS.imageSrc} · {WKE_TERRAIN_SPRITE_ATLAS.width}×
            {WKE_TERRAIN_SPRITE_ATLAS.height}
          </p>
        </details>

        <WkeTerrainAtlasSection />
        <BoardGameTerrainPreview />
        <SeamlessMapsSection variant="wke-only" />

        <footer className="border-t-2 border-kid-ink/15 pt-4 text-center text-xs font-semibold text-kid-ink/60">
          Tune rects in lib/topdown/wke-sprite-atlas.ts · path stack presets in
          lib/topdown/wke-path-tile-presets.ts · terrain stack presets in
          lib/topdown/wke-terrain-tile-presets.ts
        </footer>
      </div>

      <SpriteBoundsEditorModal />
    </BoundsOverrideProvider>
  );
}
