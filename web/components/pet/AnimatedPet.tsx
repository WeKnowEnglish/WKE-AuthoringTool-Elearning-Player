"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import {
  AnimatedPetPlayer,
  type AnimatedPetSize,
} from "@/components/pet/AnimatedPetPlayer";
import {
  DOG_POSES_URL,
  loadDogPosesDocument,
  sceneById,
} from "@/lib/blender/load-scene";
import type { RigDocument, RigScene } from "@/lib/blender/rig-types";
import {
  resolvePetMoodSceneId,
  resolvePetSceneDisplayScale,
} from "@/lib/pet/animated-pet";
import type { PetMood } from "@/lib/pet/types";

let cachedUrl: string | null = null;
let cachedDocument: Promise<RigDocument> | null = null;

function loadDocument(): Promise<RigDocument> {
  if (!cachedDocument || cachedUrl !== DOG_POSES_URL) {
    cachedUrl = DOG_POSES_URL;
    cachedDocument = loadDogPosesDocument(DOG_POSES_URL);
  }
  return cachedDocument;
}

type Props = {
  mood?: PetMood;
  size?: AnimatedPetSize;
  /** Overrides scene-based display scale when set (e.g. drink mini-game). */
  displayScale?: number;
  displayAnchor?: "center" | "bottom";
  show?: boolean;
  playing?: boolean;
  className?: string;
};

export function AnimatedPet({
  mood = "normal",
  size = "md",
  displayScale: displayScaleOverride,
  displayAnchor = "center",
  show = true,
  playing = true,
  className,
}: Props) {
  const [scene, setScene] = useState<RigScene | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScene(null);
    setLoadError(false);
    loadDocument()
      .then((doc) => {
        if (cancelled) return;
        const sceneId = resolvePetMoodSceneId(mood);
        const next = sceneById(doc, sceneId);
        if (next) setScene(next);
        else setLoadError(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mood]);

  if (!show) return null;

  if (loadError || !scene) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center text-4xl",
          className,
        )}
        aria-hidden
      >
        🐕
      </div>
    );
  }

  return (
    <AnimatedPetPlayer
      key={`${mood}-${scene.id}`}
      scene={scene}
      playing={playing}
      size={size}
      displayScale={
        displayScaleOverride ?? resolvePetSceneDisplayScale(scene.id)
      }
      displayAnchor={displayAnchor}
      className={className}
    />
  );
}
