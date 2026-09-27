"use client";

import { Suspense, type MutableRefObject } from "react";
import type { CharacterConfig } from "@/lib/character/character-types";
import { normalizeCharacterConfig } from "@/lib/character/character-normalize";
import { WkeGirlModel } from "./WkeGirlModel";

type Props = {
  config: CharacterConfig;
  scale?: number;
  walkingRef?: MutableRefObject<boolean>;
};

/**
 * The reusable live avatar boundary. It intentionally exposes one WKE girl
 * base while keeping asset-slot IDs in CharacterConfig for later GLB swaps.
 */
export function CharacterModel({ config, scale = 1, walkingRef }: Props) {
  const safe = normalizeCharacterConfig(config);
  return (
    <Suspense fallback={null}>
      <WkeGirlModel config={safe} scale={scale} walkingRef={walkingRef} />
    </Suspense>
  );
}
