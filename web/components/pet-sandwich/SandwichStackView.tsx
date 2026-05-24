"use client";

import { clsx } from "clsx";
import Image from "next/image";
import {
  SANDWICH_MINIGAME_LAYER_STACK_OFFSETS_PX,
  SANDWICH_MINIGAME_STACK_TRANSLATE_Y_PX,
  SANDWICH_MINIGAME_TOP_BREAD_OFFSET_Y_PX,
} from "@/lib/pet/animated-pet";
import {
  SANDWICH_BOTTOM_BREAD_URL,
  SANDWICH_PLATE_URL,
  SANDWICH_TOP_BREAD_URL,
  getSandwichIngredient,
} from "@/lib/sandwich/sandwich-ingredients";

/** 2.5× prior max-h-12 / sm:max-h-14 — see SANDWICH_MINIGAME_LAYER_SCALE in animated-pet.ts */
const LAYER_MAX_HEIGHT_CLASS = "max-h-[7.5rem] sm:max-h-[8.75rem]";

type Props = {
  /** Up to four ingredient ids in stack order (bottom to top). */
  layerIds: readonly (string | null)[];
  topBreadVisible?: boolean;
  topBreadAnimating?: boolean;
  className?: string;
};

export function SandwichStackView({
  layerIds,
  topBreadVisible = false,
  topBreadAnimating = false,
  className,
}: Props) {
  const filledLayers = layerIds.filter((id): id is string => id != null);

  return (
    <div
      className={clsx(
        "relative mx-auto flex h-full w-full max-w-[220px] flex-col items-center justify-end",
        className,
      )}
    >
      <Image
        src={SANDWICH_PLATE_URL}
        alt=""
        width={256}
        height={128}
        className="absolute bottom-0 left-1/2 w-[110%] max-w-none -translate-x-1/2"
        unoptimized
        aria-hidden
      />

      <div
        className="relative z-10 flex w-[72%] flex-col items-center"
        style={{ transform: `translateY(${SANDWICH_MINIGAME_STACK_TRANSLATE_Y_PX}px)` }}
      >
        <Image
          src={SANDWICH_BOTTOM_BREAD_URL}
          alt=""
          width={128}
          height={128}
          className="relative z-10 w-full drop-shadow"
          unoptimized
          aria-hidden
        />

        <div className="relative -mt-3 w-full">
          {filledLayers.map((id, index) => {
            const item = getSandwichIngredient(id);
            if (!item) return null;
            const offset =
              SANDWICH_MINIGAME_LAYER_STACK_OFFSETS_PX[
                Math.min(index, SANDWICH_MINIGAME_LAYER_STACK_OFFSETS_PX.length - 1)
              ]!;
            return (
              <div
                key={`${id}-${index}`}
                className="absolute left-1/2 z-20 w-full -translate-x-1/2 transition-transform duration-300"
                style={{ bottom: offset }}
              >
                <Image
                  src={item.imageUrl}
                  alt=""
                  width={112}
                  height={48}
                  className={clsx(
                    "h-auto w-full object-contain drop-shadow-sm",
                    LAYER_MAX_HEIGHT_CLASS,
                  )}
                  unoptimized
                  aria-hidden
                />
              </div>
            );
          })}
        </div>

        <div
          className={clsx(
            "relative z-30 w-full transition-all duration-500 ease-out",
            topBreadVisible ?
              "translate-y-0 opacity-100"
            : "-translate-y-6 opacity-0",
            topBreadAnimating && "pet-sandwich-top-bread-drop",
          )}
          style={{ marginTop: SANDWICH_MINIGAME_TOP_BREAD_OFFSET_Y_PX }}
        >
          <Image
            src={SANDWICH_TOP_BREAD_URL}
            alt=""
            width={128}
            height={128}
            className="w-full drop-shadow-md"
            unoptimized
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
