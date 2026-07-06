"use client";

import Image from "next/image";
import { clsx } from "clsx";
import type { IndividualTileDef } from "@/lib/topdown/individual-tiles";
import type {
  TileLayoutPreset,
  TileRect,
} from "@/lib/topdown/stacked-individual-layout";
import { computeStackedSpritePlacement } from "@/lib/topdown/stacked-individual-layout";

type Props = {
  tile: IndividualTileDef;
  /** Display width for the full PNG (natural preview). */
  displayWidthPx?: number;
  className?: string;
  alt?: string;
  /** Optional debug outlines in image-pixel space. */
  content?: TileRect;
  footprint?: TileRect;
  showOutlines?: boolean;
};

/** Renders a standalone tile PNG at a fixed display width (aspect preserved). */
export function TopDownIndividualTile({
  tile,
  displayWidthPx = 128,
  className,
  alt,
  content,
  footprint,
  showOutlines = false,
}: Props) {
  const scale = displayWidthPx / tile.width;
  const displayH = Math.round(tile.height * scale);

  return (
    <div
      className={clsx("relative inline-block", className)}
      style={{ width: displayWidthPx, height: displayH }}
    >
      <Image
        src={tile.imageSrc}
        alt={alt ?? tile.label}
        width={displayWidthPx}
        height={displayH}
        className="pointer-events-none max-w-none"
        draggable={false}
        unoptimized
      />
      {showOutlines && content ?
        <div
          className="pointer-events-none absolute border-2 border-fuchsia-400/90"
          style={{
            left: content.x * scale,
            top: content.y * scale,
            width: content.w * scale,
            height: content.h * scale,
          }}
          title="content"
        />
      : null}
      {showOutlines && footprint ?
        <div
          className="pointer-events-none absolute border-2 border-lime-400/90"
          style={{
            left: footprint.x * scale,
            top: footprint.y * scale,
            width: footprint.w * scale,
            height: footprint.h * scale,
          }}
          title="footprint"
        />
      : null}
    </div>
  );
}

type StackedCellProps = {
  tile: IndividualTileDef;
  footprint: TileRect;
  layout: TileLayoutPreset;
};

/**
 * One stacked map cell — footprint fills the logical square; lip hangs below.
 * Parent grid should use rowStride / columnStride from layout.
 */
export function TopDownStackedIndividualTile({
  tile,
  footprint,
  layout,
}: StackedCellProps) {
  const placement = computeStackedSpritePlacement(
    tile.width,
    tile.height,
    footprint,
    layout.logicalTilePx,
  );

  return (
    <div
      className="relative overflow-visible"
      style={{ width: layout.logicalTilePx, height: layout.logicalTilePx }}
    >
      <Image
        src={tile.imageSrc}
        alt=""
        width={placement.displayW}
        height={placement.displayH}
        className="absolute max-w-none"
        style={{ left: placement.offsetX, top: placement.offsetY }}
        draggable={false}
        unoptimized
        aria-hidden
      />
    </div>
  );
}
