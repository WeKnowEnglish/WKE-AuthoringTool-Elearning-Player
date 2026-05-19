"use client";

import { clsx } from "clsx";

type Props = {
  imageUrl: string;
  imageScale?: number;
  imageFlipHorizontal?: boolean;
  imageFlipVertical?: boolean;
  className?: string;
  dimmed?: boolean;
  /** Dark fill on opaque pixels only; requires PNG/WebP alpha (not JPEG on white). */
  silhouette?: boolean;
  /** Opacity within silhouette filter (default 0.38). Ignored when `silhouetteFilter` is set. */
  silhouetteOpacity?: number;
  /** Full CSS filter override for silhouettes (e.g. vocab learn yellow shadows). */
  silhouetteFilter?: string;
  /** Multiply blend on blue stage to hide white JPEG mats (vocab drag / learn). */
  knockOutWhiteBackground?: boolean;
  title?: string;
};

const VOCAB_KNOCKOUT_BG = "#dbeafe";

/**
 * Stable image renderer: no crop math, only centered contain-fit + scale multiplier.
 */
export function ScaledStoryItemImage({
  imageUrl,
  imageScale = 1,
  imageFlipHorizontal,
  imageFlipVertical,
  className,
  dimmed,
  silhouette,
  silhouetteOpacity = 0.38,
  silhouetteFilter,
  knockOutWhiteBackground = false,
  title,
}: Props) {
  const safeScale = Math.min(8, Math.max(0.25, imageScale || 1));
  const sx = imageFlipHorizontal ? -1 : 1;
  const sy = imageFlipVertical ? -1 : 1;
  return (
    <div
      className={clsx(
        "relative h-full w-full overflow-hidden",
        dimmed && "opacity-[0.42]",
        knockOutWhiteBackground && "isolate",
        className,
      )}
      style={knockOutWhiteBackground ? { backgroundColor: VOCAB_KNOCKOUT_BG } : undefined}
      title={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- precise static scaling for authoring/player parity */}
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className={clsx(
          "pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-center",
          knockOutWhiteBackground && !silhouette && "mix-blend-multiply",
        )}
        style={{
          transform: `scaleX(${sx}) scaleY(${sy}) scale(${safeScale})`,
          transformOrigin: "center center",
          filter:
            silhouette ?
              silhouetteFilter ?? `brightness(0) opacity(${silhouetteOpacity})`
            : undefined,
        }}
      />
    </div>
  );
}
