"use client";

import { Suspense, type ReactNode } from "react";
import { findPart } from "@/lib/character/character-assets";
import { addVec3, getBodyRig } from "@/lib/character/character-rig";
import { normalizeCharacterConfig } from "@/lib/character/character-normalize";
import type { CharacterConfig, CharacterPartDef, CharacterPartFit } from "@/lib/character/character-types";
import { kitFromCharacterConfig } from "@/lib/character/kit/kit-from-config";
import {
  AccessoryPart,
  BodyBase,
  BottomPart,
  HairPart,
  ShoesPart,
  TopPart,
} from "./character-parts";
import { CharacterStudioPart, StudioPartBoundary } from "./CharacterStudioPart";
import { CharacterKitHead } from "./kit/CharacterKitHead";

type Props = {
  config: CharacterConfig;
  scale?: number;
};

function tintFor(fit: CharacterPartFit, config: CharacterConfig): string | undefined {
  if (fit.tint === "skin") return config.skinColor;
  if (fit.tint === "hair") return config.hairColor;
  if (fit.tint === "top") return config.topColor;
  if (fit.tint === "bottom") return config.bottomColor ?? config.topColor;
  if (fit.tint === "shoes") return config.shoeColor ?? config.topColor;
  return undefined;
}

function Attached({
  sockets,
  fit,
  partScale,
  children,
}: {
  sockets: ReturnType<typeof getBodyRig>["sockets"];
  fit: CharacterPartFit;
  partScale: number;
  children: ReactNode;
}) {
  const position = addVec3(sockets[fit.socket], fit.offset ?? [0, 0, 0]);
  const scale = fit.scale ?? partScale;
  return (
    <group position={position} rotation={fit.rotation ?? [0, 0, 0]} scale={scale}>
      {children}
    </group>
  );
}

function SlotMesh({
  def,
  config,
  fallback,
}: {
  def: CharacterPartDef;
  config: CharacterConfig;
  fallback: ReactNode;
}) {
  const tint = tintFor(def.fit, config);
  if (!def.studio) return fallback;
  return (
    <StudioPartBoundary resetKey={def.studio.src} fallback={fallback}>
      <Suspense fallback={fallback}>
        <CharacterStudioPart
          src={def.studio.src}
          objectName={def.studio.objectName}
          tint={tint}
          align={def.fit.align}
          targetHeight={def.fit.targetHeight}
        />
      </Suspense>
    </StudioPartBoundary>
  );
}

/**
 * Assembled student avatar. Safe to reuse in WKE World, minigames, and profiles.
 * Do not put editor chrome, cameras, or lights in this component.
 */
export function CharacterModel({ config, scale = 1 }: Props) {
  const safe = normalizeCharacterConfig(config);
  const rig = getBodyRig(safe.body);
  const hair = findPart("hair", safe.hair);
  const face = findPart("face", safe.face);
  const top = findPart("top", safe.top);
  const bottom = findPart("bottom", safe.bottom);
  const shoes = findPart("shoes", safe.shoes);
  const accessory = findPart("accessory", safe.accessory);
  const kit = kitFromCharacterConfig(safe);
  const studioFace = Boolean(face?.studio);
  const studioHair = Boolean(hair?.studio);

  return (
    <group name="characterRoot" scale={scale}>
      <BodyBase
        rig={rig}
        color={safe.skinColor}
        showTorso={false}
        showArms={safe.top === "top_03"}
        showLegs={safe.bottom !== "bottom_02"}
      />
      <group position={rig.sockets.head} scale={rig.partScale}>
        <CharacterKitHead kit={kit} showFace={!studioFace} showHair={!studioHair} />
        {face && studioFace ? (
          <SlotMesh def={face} config={safe} fallback={null} />
        ) : null}
      </group>
      {hair && studioHair ? (
        <Attached sockets={rig.sockets} fit={hair.fit} partScale={rig.partScale}>
          <SlotMesh
            def={hair}
            config={safe}
            fallback={<HairPart recipe={hair.recipe ?? hair.id} color={safe.hairColor} />}
          />
        </Attached>
      ) : null}
      {top ? (
        <Attached sockets={rig.sockets} fit={top.fit} partScale={rig.partScale}>
          <SlotMesh
            def={top}
            config={safe}
            fallback={<TopPart recipe={top.recipe ?? top.id} color={safe.topColor} />}
          />
        </Attached>
      ) : null}
      {bottom ? (
        <Attached sockets={rig.sockets} fit={bottom.fit} partScale={rig.partScale}>
          <SlotMesh
            def={bottom}
            config={safe}
            fallback={
              <BottomPart
                recipe={bottom.recipe ?? bottom.id}
                color={safe.bottomColor ?? safe.topColor}
              />
            }
          />
        </Attached>
      ) : null}
      {shoes ? (
        <Attached sockets={rig.sockets} fit={shoes.fit} partScale={rig.partScale}>
          <SlotMesh
            def={shoes}
            config={safe}
            fallback={
              <ShoesPart recipe={shoes.recipe ?? shoes.id} color={safe.shoeColor ?? safe.topColor} />
            }
          />
        </Attached>
      ) : null}
      {accessory ? (
        <Attached sockets={rig.sockets} fit={accessory.fit} partScale={rig.partScale}>
          <SlotMesh
            def={accessory}
            config={safe}
            fallback={
              <AccessoryPart
                recipe={accessory.recipe ?? accessory.id}
                color={tintFor(accessory.fit, safe) ?? safe.topColor}
              />
            }
          />
        </Attached>
      ) : null}
    </group>
  );
}
