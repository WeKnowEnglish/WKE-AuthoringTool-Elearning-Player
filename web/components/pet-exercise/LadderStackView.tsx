"use client";

import { clsx } from "clsx";
import Image from "next/image";
import {
  EXERCISE_MINIGAME_TILE_STACK_OFFSETS_PX,
  EXERCISE_MINIGAME_LADDER_CLIMB_RANGE_PX,
} from "@/lib/pet/animated-pet";
import {
  EXERCISE_GROUND_URL,
  EXERCISE_LADDER_URL,
  EXERCISE_TILE_PLACEHOLDER_URL,
  getExerciseTile,
  type ExerciseTile,
} from "@/lib/exercise/exercise-tiles";

type Props = {
  /** Up to six word ids in stack order (bottom to top). */
  tileIds: readonly (string | null)[];
  tiles: ExerciseTile[];
  className?: string;
};

export function LadderStackView({ tileIds, tiles, className }: Props) {
  const filled = tileIds
    .map((id, index) => (id != null ? { id, index } : null))
    .filter((x): x is { id: string; index: number } => x != null);

  return (
    <div
      className={clsx(
        "relative mx-auto flex h-full w-full max-w-[260px] flex-col items-center justify-end",
        className,
      )}
    >
      <Image
        src={EXERCISE_GROUND_URL}
        alt=""
        width={240}
        height={24}
        className="absolute bottom-0 left-1/2 w-[115%] max-w-none -translate-x-1/2"
        unoptimized
        aria-hidden
      />

      <div className="relative z-10 flex h-[88%] w-full items-end justify-center gap-1 pb-6">
        <Image
          src={EXERCISE_LADDER_URL}
          alt=""
          width={80}
          height={320}
          className="h-full w-auto max-h-full object-contain drop-shadow-md"
          unoptimized
          aria-hidden
        />

        <div className="relative h-full min-w-[7rem] flex-1 max-w-[9rem]">
          {filled.map(({ id, index }) => {
            const tile = getExerciseTile(tiles, id);
            if (!tile) return null;
            const offset =
              EXERCISE_MINIGAME_TILE_STACK_OFFSETS_PX[
                Math.min(
                  index,
                  EXERCISE_MINIGAME_TILE_STACK_OFFSETS_PX.length - 1,
                )
              ]!;
            return (
              <div
                key={`${id}-${index}`}
                className="absolute left-0 right-0 z-20 transition-all duration-300 pet-exercise-tile-land"
                style={{ bottom: offset }}
              >
                <div className="relative mx-auto w-full max-w-[7.5rem]">
                  <Image
                    src={EXERCISE_TILE_PLACEHOLDER_URL}
                    alt=""
                    width={120}
                    height={56}
                    className="h-auto w-full object-contain drop-shadow-sm"
                    unoptimized
                    aria-hidden
                  />
                  <p className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] font-extrabold leading-tight text-kid-ink sm:text-xs">
                    {tile.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p
        className="sr-only"
        aria-live="polite"
      >
        {filled.length} of 6 words on the ladder
      </p>
    </div>
  );
}

/** Pet climb offset from bottom based on filled slot count (0–6). */
export function exercisePetClimbTranslateY(filledCount: number): number {
  const ratio = Math.min(6, Math.max(0, filledCount)) / 6;
  return Math.round(EXERCISE_MINIGAME_LADDER_CLIMB_RANGE_PX * ratio);
}
