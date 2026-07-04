"use client";

import { SpriteAtlasCard } from "@/components/pilots/topdown-sprites/SpriteAtlasCard";
import type { SpriteCategory } from "@/lib/topdown";
import { SPRITE_FRAMES_BY_CATEGORY } from "@/lib/topdown";

const CATEGORY_LABELS: Record<SpriteCategory, string> = {
  grass: "Grass tiles",
  soil: "Soil tiles",
  plant: "Plant growth stages",
  item: "Garden items",
  weed: "Weeds",
  fence: "Fence pieces",
};

const CATEGORY_ORDER: SpriteCategory[] = [
  "grass",
  "soil",
  "plant",
  "item",
  "weed",
  "fence",
];

export function SpriteAtlasSection() {
  return (
    <section id="atlas" className="scroll-mt-6 space-y-6">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Atlas reference
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          All 15 assets with manual sx/sy/sw/sh bounds — double-click a card to edit.
        </p>
      </header>

      {CATEGORY_ORDER.map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SPRITE_FRAMES_BY_CATEGORY[category].map((frame) => (
              <SpriteAtlasCard key={frame.id} frame={frame} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
