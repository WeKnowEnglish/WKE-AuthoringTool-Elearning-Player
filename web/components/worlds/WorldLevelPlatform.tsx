"use client";

import { clsx } from "clsx";
import type { WorldTheme } from "@/lib/worlds/types";

type Props = {
  theme: WorldTheme;
  className?: string;
};

/** Hexagonal prism platform the player stands on. */
export function WorldLevelPlatform({ theme, className }: Props) {
  return (
    <svg
      viewBox="0 0 200 72"
      className={clsx("mx-auto w-full max-w-[14rem]", className)}
      aria-hidden
    >
      <polygon
        points="100,8 172,40 172,52 100,64 28,52 28,40"
        fill={theme.platformTop}
        stroke={theme.ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polygon
        points="28,52 100,64 172,52 172,68 100,68 28,68"
        fill={theme.platformSide}
        stroke={theme.ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <line
        x1="100"
        y1="8"
        x2="100"
        y2="64"
        stroke={theme.platformEdge}
        strokeWidth="2"
        opacity="0.45"
      />
    </svg>
  );
}
