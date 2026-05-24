"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSandwichIngredient } from "@/lib/sandwich/sandwich-ingredients";

type Props = {
  ingredientId: string;
  fromRect: DOMRect;
  toRect: DOMRect;
  onDone: () => void;
};

export function PetSandwichFlyAnimation({
  ingredientId,
  fromRect,
  toRect,
  onDone,
}: Props) {
  const imageUrl = getSandwichIngredient(ingredientId)?.imageUrl ?? "";
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
      className="pointer-events-none fixed z-[90] h-16 w-16 drop-shadow-md sm:h-[4.5rem] sm:w-[4.5rem]"
      style={{
        left: atTarget ? toX : fromX,
        top: atTarget ? toY : fromY,
        transform: "translate(-50%, -50%)",
        transition: "left 0.38s ease-in, top 0.38s ease-in, opacity 0.16s ease-out",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {imageUrl ?
        <Image
          src={imageUrl}
          alt=""
          width={80}
          height={80}
          className="h-full w-full object-contain"
          unoptimized
        />
      : null}
    </div>
  );
}
