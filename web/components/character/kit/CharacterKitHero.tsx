"use client";

import { Suspense } from "react";
import type { CharacterHeroDef } from "@/lib/character/kit/hero-assets";
import { CharacterStudioPart, StudioPartBoundary } from "../CharacterStudioPart";
import { StudentHead } from "../StudentHead";
import type { CharacterKitDocument } from "@/lib/character/kit/kit-types";
import type { RegionHighlightFlags } from "@/lib/character/kit/highlight-regions";

type Props = {
  kit: CharacterKitDocument;
  hero: CharacterHeroDef;
  showHair?: boolean;
  showPolygons?: boolean;
  highlights?: RegionHighlightFlags;
};

function ProceduralHero({ kit }: { kit: CharacterKitDocument }) {
  return <StudentHead color={kit.skinColor} regions={kit.regions} earScale={kit.ears.size} />;
}

const HAIR_HIDDEN = ["Hair"];
const SCALP_HIDDEN = ["Scalp"];

/**
 * Locked hero cage: procedural toy head, or an image-to-3D / authored GLB.
 */
export function CharacterKitHero({
  kit,
  hero,
  showHair = true,
  showPolygons = false,
  highlights,
}: Props) {
  if (hero.kind !== "glb" || !hero.src) {
    return <ProceduralHero kit={kit} />;
  }

  const fallback = <ProceduralHero kit={kit} />;
  return (
    <StudioPartBoundary resetKey={`${hero.src}:${showPolygons}:${JSON.stringify(highlights ?? {})}`} fallback={fallback}>
      <Suspense fallback={fallback}>
        <group scale={hero.previewScale ?? 1}>
          <CharacterStudioPart
            src={hero.src}
            tint={hero.tintSkin ? kit.skinColor : undefined}
            namedTints={{
              ...(hero.tintHair ? { Hair: kit.hairColor } : {}),
              ...(hero.hasSeparateHair ? { Scalp: kit.skinColor } : {}),
            }}
            hiddenNames={!hero.hasSeparateHair ? undefined : showHair ? SCALP_HIDDEN : HAIR_HIDDEN}
            align={hero.preview === "body" ? "bottom" : "center"}
            targetHeight={hero.targetHeight}
            polygonMask={showPolygons}
            highlights={highlights}
          />
        </group>
      </Suspense>
    </StudioPartBoundary>
  );
}
