"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Group } from "three";
import { CharacterModel } from "@/components/character/CharacterModel";
import { loadPlayAvatarLook, PLAY_AVATAR_SCALE, type PlayAvatarLook } from "@/lib/world/play-avatar";

type Props = {
  walkingRef?: MutableRefObject<boolean>;
  scale?: number;
};

/**
 * Student avatar in world play. Uses the outfit editor loadout and, when
 * present, the head kit from the character kit studio.
 */
export function PlayAvatar({ walkingRef, scale = PLAY_AVATAR_SCALE }: Props) {
  const rootRef = useRef<Group>(null);
  const [look, setLook] = useState<PlayAvatarLook | null>(null);
  const bounce = useRef(0);

  useEffect(() => {
    setLook(loadPlayAvatarLook());
  }, []);

  useFrame((_, dt) => {
    const moving = walkingRef?.current === true;
    const step = Math.min(dt, 0.05);
    bounce.current = moving
      ? Math.min(1, bounce.current + step * 8)
      : Math.max(0, bounce.current - step * 10);
    if (!rootRef.current) return;
    const t = performance.now() * 0.012;
    rootRef.current.position.y = moving ? Math.abs(Math.sin(t)) * 0.04 * bounce.current : 0;
  });

  if (!look) return null;

  return (
    <group ref={rootRef} name="play-avatar">
      <CharacterModel config={look.config} kit={look.kit} scale={scale} />
    </group>
  );
}
