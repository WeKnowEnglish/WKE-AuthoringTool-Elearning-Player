"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getExerciseTile } from "@/lib/exercise/exercise-tiles";
import type { ExerciseTile } from "@/lib/exercise/exercise-tiles";

type Props = {
  tileId: string;
  tiles: ExerciseTile[];
  fromRect: DOMRect;
  toRect: DOMRect;
  onDone: () => void;
};

export function PetExerciseFlyAnimation({
  tileId,
  tiles,
  fromRect,
  toRect,
  onDone,
}: Props) {
  const tile = getExerciseTile(tiles, tileId);
  const imageUrl = tile?.imageUrl ?? "";
  const label = tile?.label ?? tileId;
  const [atTarget, setAtTarget] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAtTarget(true));
    const fadeTimer = window.setTimeout(() => setFadeOut(true), 400);
    const doneTimer = window.setTimeout(onDone, 540);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[90] h-14 w-[7rem] drop-shadow-md sm:h-16"
      style={{
        left: atTarget ? toX : fromX,
        top: atTarget ? toY : fromY,
        transform: "translate(-50%, -50%)",
        transition: "left 0.38s ease-in, top 0.38s ease-in, opacity 0.16s ease-out",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {imageUrl ?
        <>
          <Image
            src={imageUrl}
            alt=""
            width={120}
            height={56}
            className="h-full w-full object-contain"
            unoptimized
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-kid-ink">
            {label}
          </span>
        </>
      : null}
    </div>
  );
}
