"use client";

import { clsx } from "clsx";
import type { GardenPlotOverlayVariant } from "@/lib/garden/garden-map-layout";

type Props = {
  text: string;
  variant?: GardenPlotOverlayVariant;
  className?: string;
};

/** Timer / action label rendered on the tile below the plot. */
export function GardenPlotLabel({ text, variant = "timer", className }: Props) {
  const isReady = variant === "ready";
  const showWeed = variant === "weed";

  return (
    <span
      className={clsx(
        "text-center text-[0.55rem] font-bold leading-tight sm:text-[0.6rem]",
        isReady && !showWeed && "font-extrabold uppercase text-emerald-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
        showWeed && "font-extrabold uppercase text-lime-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
        !isReady && !showWeed && "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {text}
    </span>
  );
}
