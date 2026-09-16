"use client";

import { useLayoutEffect, useMemo } from "react";
import { findHero } from "@/lib/character/kit/hero-assets";
import { buildHeroObject, disposeHeroObject } from "@/lib/character/kit/build-hero-object";
import { applyPolygonMask } from "@/lib/character/kit/polygon-mask";
import { applyRegionHighlights, dimPreviewMeshes } from "@/lib/character/kit/apply-region-highlights";
import { anyRegionHighlight, type RegionHighlightFlags } from "@/lib/character/kit/highlight-regions";
import type { CharacterKitDocument } from "@/lib/character/kit/kit-types";
import { CharacterKitHero } from "./CharacterKitHero";

type Props = {
  kit: CharacterKitDocument;
  showFace?: boolean;
  showHair?: boolean;
  showPolygons?: boolean;
  highlights?: RegionHighlightFlags;
};

/**
 * Evaluates a kit with the same local mesh builder the CLI uses.
 * Compiled hero GLBs load through CharacterKitHero instead.
 */
export function CharacterKitHead({
  kit,
  showFace = true,
  showHair = true,
  showPolygons = false,
  highlights,
}: Props) {
  const hero = findHero(kit.hero);
  const compiled = hero.kind === "glb" && Boolean(hero.src);
  const object = useMemo(
    () => (compiled ? null : buildHeroObject(kit, { showFace, showHair })),
    [compiled, kit, showFace, showHair, showPolygons, highlights],
  );
  useLayoutEffect(() => {
    if (!object) return undefined;
    try {
      if (highlights && anyRegionHighlight(highlights)) applyRegionHighlights(object, highlights);
      if (showPolygons) applyPolygonMask(object);
      if (highlights && anyRegionHighlight(highlights)) dimPreviewMeshes(object);
    } catch {
      if (showPolygons) applyPolygonMask(object);
    }
    return () => disposeHeroObject(object);
  }, [object, showPolygons, highlights]);

  if (compiled && hero.src) {
    return (
      <group name="characterKitHead">
        <CharacterKitHero
          kit={kit}
          hero={hero}
          showHair={showHair}
          showPolygons={showPolygons}
          highlights={highlights}
        />
      </group>
    );
  }

  return object ? <primitive object={object} /> : null;
}
