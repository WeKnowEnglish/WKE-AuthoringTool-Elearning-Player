"use client";

import { MysteryHotspot } from "@/components/mystery/MysteryHotspot";
import type {
  MysteryHotspotDefinition,
  MysterySceneDefinition,
} from "@/lib/mystery/types";

type MysterySceneProps = {
  scene: MysterySceneDefinition;
  availableHotspotIds: ReadonlySet<string>;
  inspectedHotspotIds: ReadonlySet<string>;
  onHotspotActivate: (hotspot: MysteryHotspotDefinition) => void;
};

export function MysteryScene({
  scene,
  availableHotspotIds,
  inspectedHotspotIds,
  onHotspotActivate,
}: MysterySceneProps) {
  return (
    <section aria-label={scene.title}>
      <div
        className="relative w-full overflow-hidden rounded-2xl border-4 border-kid-ink bg-sky-100 shadow-[5px_5px_0_0_var(--kid-shadow)]"
        style={{ aspectRatio: scene.image.width + " / " + scene.image.height }}
      >
        {/* Scene URLs are content data and may later come from authored packs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scene.image.src}
          alt={scene.image.alt}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
        {scene.hotspots.map((hotspot) => {
          const available = availableHotspotIds.has(hotspot.id);
          if (!available && hotspot.hideUntilAvailable) return null;
          return (
            <MysteryHotspot
              key={hotspot.id}
              hotspot={hotspot}
              available={available}
              inspected={inspectedHotspotIds.has(hotspot.id)}
              onActivate={() => onHotspotActivate(hotspot)}
            />
          );
        })}
      </div>
      {scene.description ? (
        <p className="mt-2 text-sm font-semibold text-kid-ink/70">
          {scene.description}
        </p>
      ) : null}
    </section>
  );
}
