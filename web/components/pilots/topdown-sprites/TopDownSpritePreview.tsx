"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useState } from "react";
import { BoardGameTerrainTab } from "@/components/pilots/topdown-sprites/BoardGameTerrainTab";
import { BoundsOverrideProvider } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { GardenOverlayAtlasSection } from "@/components/pilots/topdown-sprites/GardenOverlayAtlasSection";
import { LetterFruitGrowthPreview } from "@/components/pilots/topdown-sprites/LetterFruitGrowthPreview";
import { LetterFruitAtlasSection } from "@/components/pilots/topdown-sprites/LetterFruitAtlasSection";
import { LetterFruitSelectorProvider } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { GardenDesignPreview } from "@/components/pilots/topdown-sprites/GardenDesignPreview";
import { IndividualTileEditorProvider } from "@/components/pilots/topdown-sprites/IndividualTileEditorContext";
import { IndividualTileEditorModal } from "@/components/pilots/topdown-sprites/IndividualTileEditorModal";
import { PlotLayerEditorProvider } from "@/components/pilots/topdown-sprites/PlotLayerEditorContext";
import { PlotLayerEditorModal } from "@/components/pilots/topdown-sprites/PlotLayerEditorModal";
import { SpriteAtlasSection } from "@/components/pilots/topdown-sprites/SpriteAtlasSection";
import { SpriteBoundsEditorModal } from "@/components/pilots/topdown-sprites/SpriteBoundsEditorModal";
import { GARDEN_SPRITE_ATLAS } from "@/lib/topdown/garden-sprite-atlas";

type PilotTab = "garden" | "board-game";

const TABS: { id: PilotTab; label: string; description: string }[] = [
  {
    id: "garden",
    label: "Garden tiles",
    description: "Individual tile library — grass, dirt, and plant growth stages.",
  },
  {
    id: "board-game",
    label: "Board game terrain",
    description: "WKE terrain sheet — tune atlas rects and preview board path layouts.",
  },
];

const GARDEN_SECTION_LINKS = [
  { href: "#atlas", label: "Atlas" },
  { href: "#letter-fruit", label: "Letter fruit" },
  { href: "#letter-fruit-growth", label: "On plot" },
  { href: "#overlays", label: "Tools & weeds" },
  { href: "#garden", label: "Garden designs" },
] as const;

function GardenTilesTab() {
  return (
    <BoundsOverrideProvider>
      <LetterFruitSelectorProvider>
      <PlotLayerEditorProvider>
        <IndividualTileEditorProvider>
        <div className="flex flex-col gap-10">
          <nav
            className="flex flex-wrap justify-center gap-2"
            aria-label="Garden preview sections"
          >
            {GARDEN_SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-1.5 text-sm font-bold text-kid-ink transition-colors hover:bg-kid-surface-muted"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <details className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel p-4">
            <summary className="cursor-pointer text-sm font-bold text-kid-ink/80">
              View garden source sheet
            </summary>
            <Image
              src={GARDEN_SPRITE_ATLAS.imageSrc}
              alt="Language Garden sprite sheet"
              width={GARDEN_SPRITE_ATLAS.width}
              height={GARDEN_SPRITE_ATLAS.height}
              className="mt-3 h-auto w-full rounded-lg border-4 border-kid-ink/30"
            />
            <p className="mt-2 text-center font-mono text-xs text-kid-ink/60">
              {GARDEN_SPRITE_ATLAS.imageSrc} · {GARDEN_SPRITE_ATLAS.width}×
              {GARDEN_SPRITE_ATLAS.height}
            </p>
          </details>

          <SpriteAtlasSection />
          <LetterFruitAtlasSection />
          <LetterFruitGrowthPreview />
          <GardenOverlayAtlasSection />
          <GardenDesignPreview />

          <footer className="border-t-2 border-kid-ink/15 pt-4 text-center text-xs font-semibold text-kid-ink/60">
            Plot tiles: add a PNG to public/assets/tiles/, preset in tile-presets/, register in
            individual-tiles.ts. Letter fruit: stage sheets in public/assets/Letter Fruit Stages/,
            rects in lib/topdown/letter-fruit-atlas.ts. Tools &amp; weed: garden-sprite-atlas.ts.
          </footer>
        </div>

        <IndividualTileEditorModal />
        <SpriteBoundsEditorModal />
        <PlotLayerEditorModal />
        </IndividualTileEditorProvider>
      </PlotLayerEditorProvider>
      </LetterFruitSelectorProvider>
    </BoundsOverrideProvider>
  );
}

export function TopDownSpritePreview() {
  const [tab, setTab] = useState<PilotTab>("garden");
  const activeTab = TABS.find((entry) => entry.id === tab) ?? TABS[0];

  return (
    <main
      className={clsx(
        "mx-auto flex w-full flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10",
        tab === "board-game" ? "max-w-5xl" : "max-w-5xl",
      )}
    >
      <header className="space-y-3 text-center">
        <h1 className="text-2xl font-extrabold text-kid-ink sm:text-3xl">Top-Down Sprite Preview</h1>
        <p className="text-sm font-semibold text-kid-ink/80 sm:text-base">{activeTab.description}</p>

        <div
          role="tablist"
          aria-label="Sprite pilot sections"
          className="mx-auto flex max-w-md rounded-xl border-2 border-kid-ink bg-white p-1"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={clsx(
                "min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-extrabold transition-colors [touch-action:manipulation]",
                tab === entry.id ?
                  "bg-[#f7bf4d] text-kid-ink"
                : "text-kid-ink/75 hover:bg-neutral-100",
              )}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "garden" ?
        <GardenTilesTab />
      : <BoardGameTerrainTab />}
    </main>
  );
}
