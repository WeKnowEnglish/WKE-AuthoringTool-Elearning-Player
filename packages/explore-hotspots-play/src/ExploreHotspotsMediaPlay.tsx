"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { contoursToSvgPath } from "./contours";
import { pickHotspotId } from "./hitTest";
import {
  DEFAULT_HOTSPOT_HIGHLIGHT,
  type HotspotGeometry,
  type HotspotVisualShape,
  type PlayHotspot,
  type PlayMedia,
} from "./types";

const SCALE = 1000;
const HOVER_STROKE = "#ffffff";
const FOCUS_STROKE = "#fcd34d"; // amber-300

type ShapeStyle = {
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  filter?: string;
  strokeDasharray?: string;
  style?: CSSProperties;
};

function HotspotShape({
  geometry,
  ...style
}: { geometry: HotspotGeometry } & ShapeStyle) {
  if (geometry.shape === "rectangle") {
    return (
      <rect
        {...style}
        x={geometry.x * SCALE}
        y={geometry.y * SCALE}
        width={geometry.width * SCALE}
        height={geometry.height * SCALE}
        rx={12}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  if (geometry.shape === "ellipse") {
    return (
      <ellipse
        {...style}
        cx={geometry.cx * SCALE}
        cy={geometry.cy * SCALE}
        rx={geometry.rx * SCALE}
        ry={geometry.ry * SCALE}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  return (
    <polygon
      {...style}
      points={geometry.points.map((p) => `${p.x * SCALE},${p.y * SCALE}`).join(" ")}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function VisualShape({
  hotspot,
  visualShape,
  ...style
}: {
  hotspot: PlayHotspot;
  visualShape?: HotspotVisualShape;
} & ShapeStyle) {
  const precise = visualShape ?? hotspot.visualShape;
  if (precise?.paths?.length) {
    return (
      <path
        {...style}
        d={contoursToSvgPath(precise.paths, SCALE)}
        fillRule="evenodd"
        clipRule="evenodd"
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  return <HotspotShape geometry={hotspot.geometry} {...style} />;
}

function resolveStroke(args: {
  selected: boolean;
  visited: boolean;
  hovered: boolean;
  focused: boolean;
  color: string;
}): { stroke: string; strokeWidth: number } {
  const { selected, visited, hovered, focused, color } = args;
  if (selected) {
    return { stroke: color, strokeWidth: DEFAULT_HOTSPOT_HIGHLIGHT.outlineWidth };
  }
  if (focused) {
    return { stroke: FOCUS_STROKE, strokeWidth: 4 };
  }
  if (hovered) {
    return { stroke: HOVER_STROKE, strokeWidth: 4 };
  }
  if (visited) {
    return { stroke: "rgba(52,211,153,.7)", strokeWidth: 2 };
  }
  return { stroke: "transparent", strokeWidth: 3 };
}

export type ExploreHotspotsMediaPlayProps = {
  media: PlayMedia;
  hotspots: PlayHotspot[];
  selectedId?: string | null;
  visitedIds?: string[];
  onSelect?: (id: string) => void;
};

/**
 * Shared play-mode media stage: image + segmentation spotlight mask + outline glow.
 * Used by EDU Studio preview and Lesson Player runtime.
 */
export function ExploreHotspotsMediaPlay({
  media,
  hotspots,
  selectedId = null,
  visitedIds = [],
  onSelect,
}: ExploreHotspotsMediaPlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const width = media.intrinsicWidth ?? 16;
  const height = media.intrinsicHeight ?? 9;
  const selectedHotspot = hotspots.find((h) => h.id === selectedId) ?? null;
  const orderedHotspots = [...hotspots].sort(
    (a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0),
  );
  const selectedHighlight = {
    ...DEFAULT_HOTSPOT_HIGHLIGHT,
    ...selectedHotspot?.highlight,
  };
  const effectId = `hotspot-${reactId}-${(selectedId ?? "none").replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const pointerPoint = (event: ReactPointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const updateHoverFromPointer = (event: ReactPointerEvent) => {
    const id = pickHotspotId(pointerPoint(event), hotspots);
    setHoveredId(id);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-slate-900 shadow-2xl"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* Native img: supports data URLs and local public paths without Next image config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.src}
        alt={media.alt ?? "Activity image"}
        className="absolute inset-0 h-full w-full select-none object-contain"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SCALE} ${SCALE}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{ cursor: hoveredId || focusedId ? "pointer" : "default" }}
        onPointerMove={updateHoverFromPointer}
        onPointerLeave={() => setHoveredId(null)}
        onPointerDown={(event) => {
          if (!onSelect) return;
          const id = pickHotspotId(pointerPoint(event), hotspots);
          if (id) onSelect(id);
        }}
      >
        {selectedHotspot ? (
          <defs>
            <mask id={`${effectId}-spotlight`}>
              <rect width={SCALE} height={SCALE} fill="white" />
              <VisualShape hotspot={selectedHotspot} fill="black" />
            </mask>
            <filter id={`${effectId}-glow`} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation={selectedHighlight.glowRadius} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        ) : null}

        {selectedHotspot && selectedHighlight.style === "spotlight-outline" ? (
          <rect
            width={SCALE}
            height={SCALE}
            fill="#020617"
            opacity={selectedHighlight.backgroundDim}
            mask={`url(#${effectId}-spotlight)`}
            className="pointer-events-none"
          />
        ) : null}

        {orderedHotspots.map((hotspot) => {
          const selected = selectedId === hotspot.id;
          const visited = visitedIds.includes(hotspot.id);
          const hovered = hoveredId === hotspot.id;
          const focused = focusedId === hotspot.id;
          const color = hotspot.highlight?.color ?? DEFAULT_HOTSPOT_HIGHLIGHT.color;
          const outlineWidth =
            hotspot.highlight?.outlineWidth ?? DEFAULT_HOTSPOT_HIGHLIGHT.outlineWidth;
          const style = hotspot.highlight?.style ?? DEFAULT_HOTSPOT_HIGHLIGHT.style;
          const stroke = resolveStroke({
            selected,
            visited,
            hovered,
            focused,
            color,
          });
          if (selected) {
            stroke.strokeWidth = outlineWidth;
          }

          return (
            <g
              key={hotspot.id}
              role="button"
              tabIndex={0}
              aria-label={hotspot.accessibleLabel}
              className="outline-none"
              onFocus={() => setFocusedId(hotspot.id)}
              onBlur={(event: ReactFocusEvent<SVGGElement>) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setFocusedId((current) => (current === hotspot.id ? null : current));
                }
              }}
              onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.(hotspot.id);
                }
              }}
            >
              <VisualShape
                hotspot={hotspot}
                fill={selected ? `${color}12` : hovered || focused ? `${HOVER_STROKE}18` : "transparent"}
                stroke={stroke.stroke}
                strokeWidth={stroke.strokeWidth}
                filter={
                  selected && style !== "outline" ? `url(#${effectId}-glow)` : undefined
                }
                className="pointer-events-none"
              />
              {/* Wide invisible hit target for mouse / touch / hover detection. */}
              <HotspotShape
                geometry={hotspot.geometry}
                fill="transparent"
                stroke="transparent"
                strokeWidth={22}
                className="pointer-events-none"
              />
              <title>{hotspot.accessibleLabel}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
