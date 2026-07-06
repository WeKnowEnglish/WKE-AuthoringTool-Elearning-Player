"use client";

import { SpriteAtlasCard } from "@/components/pilots/topdown-sprites/SpriteAtlasCard";
import { INDIVIDUAL_TILES } from "@/lib/topdown/individual-tiles";
import type { SpriteCategory } from "@/lib/topdown/types";

const CATEGORY_LABELS: Partial<Record<SpriteCategory, string>> = {
  grass: "Grass tiles",
  soil: "Soil tiles",
  plant: "Plant growth stages",
  item: "Garden items",
  weed: "Weeds",
  fence: "Fence pieces",
};

export function SpriteAtlasSection() {
  const categories = [...new Set(INDIVIDUAL_TILES.map((t) => t.category))];

  return (
    <section id="atlas" className="scroll-mt-6 space-y-6">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Atlas reference
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          Approved individual tiles.{" "}
          <strong>Double-click</strong> a card to tune footprint, lip, and column
          overlap. Copy the preset into{" "}
          <code className="rounded bg-kid-ink/10 px-1">tile-presets/</code>.
        </p>
      </header>

      {categories.map((category) => {
        const tiles = INDIVIDUAL_TILES.filter((t) => t.category === category);
        if (tiles.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">
              {CATEGORY_LABELS[category] ?? category}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.map((tile) => (
                <SpriteAtlasCard key={tile.id} tile={tile} />
              ))}
            </div>
          </div>
        );
      })}

      {INDIVIDUAL_TILES.length === 0 ?
        <p className="text-sm font-semibold text-kid-ink/60">No tiles in the library yet.</p>
      : null}
    </section>
  );
}
