"use client";

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
  title?: string;
};

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
  title,
}: Props) {
  const safeScale = Math.min(8, Math.max(0.25, imageScale || 1));
  const sx = imageFlipHorizontal ? -1 : 1;
  const sy = imageFlipVertical ? -1 : 1;
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${dimmed ? "opacity-[0.42]" : ""} ${className ?? ""}`}
      title={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- precise static scaling for authoring/player parity */}
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-center"
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
