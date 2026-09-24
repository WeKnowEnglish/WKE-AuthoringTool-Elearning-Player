"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Group } from "three";
import { CharacterModel } from "@/components/character/CharacterModel";
import { CHARACTER_STORAGE_KEY } from "@/lib/character/character-storage";
import { CHARACTER_KIT_STORAGE_KEY } from "@/lib/character/kit/kit-storage";
import { loadPlayAvatarLook, PLAY_AVATAR_SCALE, type PlayAvatarLook } from "@/lib/world/play-avatar";

type Props = {
  walkingRef?: MutableRefObject<boolean>;
  scale?: number;
};

function lookKey(look: PlayAvatarLook): string {
  return `${look.config.top}:${look.config.bottom}:${look.config.shoes}:${look.config.hair}:${look.kit.id}:${look.kit.name}`;
}

/**
 * Student avatar in world play. Uses the outfit editor loadout and, when
 * present, the head kit from the character kit studio.
 */
export function PlayAvatar({ walkingRef, scale = PLAY_AVATAR_SCALE }: Props) {
  const rootRef = useRef<Group>(null);
  const [look, setLook] = useState<PlayAvatarLook | null>(null);
  const bounce = useRef(0);

  useEffect(() => {
    const refresh = () => setLook(loadPlayAvatarLook());
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key.includes(CHARACTER_STORAGE_KEY) || event.key.includes(CHARACTER_KIT_STORAGE_KEY)) {
        refresh();
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("visibilitychange", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useFrame((_, dt) => {
    const moving = walkingRef?.current === true;
    const step = Math.min(dt, 0.05);
    bounce.current = moving
      ? Math.min(1, bounce.current + step * 8)
      : Math.max(0, bounce.current - step * 10);
    if (!rootRef.current) return;
    const t = performance.now() * 0.014;
    rootRef.current.position.y = moving ? Math.abs(Math.sin(t)) * 0.05 * bounce.current : 0;
    rootRef.current.rotation.z = moving ? Math.sin(t) * 0.04 * bounce.current : 0;
  });

  if (!look) return null;

  return (
    <group ref={rootRef} name="play-avatar">
      <CharacterModel key={lookKey(look)} config={look.config} kit={look.kit} scale={scale} walkingRef={walkingRef} />
    </group>
  );
}
