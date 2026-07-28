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
  OBJECT_ANIMATION_KEYFRAMES_CSS,
  objectAnimationStyle,
} from "./objectAnimation";
import { geometryCenter, normalizeRotationDeg } from "./rotation";
import {
  resolveTextStyle,
  textAnchorForAlign,
  textFontSize,
  textXForAlign,
} from "./textStyle";
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

function svgRotateTransform(geometry: HotspotGeometry, rotationDeg = 0): string | undefined {
  const rotation = normalizeRotationDeg(rotationDeg);
  if (!rotation) return undefined;
  const center = geometryCenter(geometry);
  return `rotate(${rotation} ${center.x * SCALE} ${center.y * SCALE})`;
}

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
  /** Soft pulse outline for the next hinted object. */
  hintPulseId?: string | null;
  /** Locked / not-yet-available objects (still visible, not selectable). */
  lockedIds?: string[];
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
  hintPulseId = null,
  lockedIds = [],
  onSelect,
}: ExploreHotspotsMediaPlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const width = media.intrinsicWidth ?? 16;
  const height = media.intrinsicHeight ?? 9;
  const orderedHotspots = [...hotspots].sort((a, b) => {
    const az = a.zIndex ?? a.tabOrder ?? 0;
    const bz = b.zIndex ?? b.tabOrder ?? 0;
    return az - bz;
  });
  const visibleHotspots = orderedHotspots.filter((hotspot) => hotspot.visible !== false);
  const lockedSet = new Set(lockedIds);
  const selectableHotspots = visibleHotspots.filter(
    (hotspot) =>
      hotspot.interactionKind !== "none" && !lockedSet.has(hotspot.id),
  );
  const selectedHotspotCandidate = hotspots.find((h) => h.id === selectedId) ?? null;
  const selectedHotspot =
    selectedHotspotCandidate?.presentation === "sprite" ||
    selectedHotspotCandidate?.presentation === "shape" ||
    selectedHotspotCandidate?.presentation === "text"
      ? null
      : selectedHotspotCandidate;
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
    const id = pickHotspotId(pointerPoint(event), selectableHotspots);
    setHoveredId(id);
  };

  const trySelect = (id: string | null) => {
    if (!onSelect || !id || lockedSet.has(id)) return;
    onSelect(id);
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
      <div className="pointer-events-none absolute inset-0">
        {visibleHotspots.map((hotspot, index) => {
          const stackZ = hotspot.zIndex ?? hotspot.tabOrder ?? index;
          const locked = lockedSet.has(hotspot.id);
          if (hotspot.presentation === "sprite") {
            if (hotspot.geometry.shape !== "rectangle" || !hotspot.spriteSrc) return null;
            const { x, y, width: w, height: h } = hotspot.geometry;
            const opacity = (hotspot.opacity ?? 1) * (locked ? 0.45 : 1);
            const motion = objectAnimationStyle(hotspot.animation, {
              forcePulse: hotspot.pulse === true,
              rotationDeg: hotspot.rotationDeg ?? 0,
            });
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={hotspot.id}
                src={hotspot.spriteSrc}
                alt=""
                draggable={false}
                className="explore-object-motion absolute select-none object-contain"
                style={{
                  zIndex: stackZ,
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: `${w * 100}%`,
                  height: `${h * 100}%`,
                  opacity,
                  ...motion,
                  transition:
                    "left 80ms linear, top 80ms linear, width 80ms linear, height 80ms linear, opacity 80ms linear",
                }}
              />
            );
          }

          const selected = selectedId === hotspot.id;
          const visited = visitedIds.includes(hotspot.id);
          const pulsed = hintPulseId === hotspot.id;
          const interactive =
            hotspot.interactionKind !== "none" && !locked;
          const hovered = interactive && hoveredId === hotspot.id;
          const focused = interactive && focusedId === hotspot.id;
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
          if (selected) stroke.strokeWidth = outlineWidth;
          if (pulsed && !selected) {
            stroke.stroke = color;
            stroke.strokeWidth = Math.max(stroke.strokeWidth, 4);
          }
          const motion = objectAnimationStyle(hotspot.animation, {
            forcePulse: hotspot.pulse === true,
          });
          const hasMotion = Boolean(motion.animationName);

          return (
            <svg
              key={hotspot.id}
              viewBox={`0 0 ${SCALE} ${SCALE}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              style={{ zIndex: stackZ }}
              aria-hidden
            >
              {selected && style !== "outline" ? (
                <defs>
                  <filter id={`${effectId}-glow`} x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation={selectedHighlight.glowRadius} result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              ) : null}
              <g transform={svgRotateTransform(hotspot.geometry, hotspot.rotationDeg ?? 0)}>
                <g
                  className={hasMotion ? "explore-object-motion" : undefined}
                  style={hasMotion ? motion : undefined}
                >
                  {hotspot.presentation === "shape" || hotspot.presentation === "text" ? (
                    hotspot.geometry.shape === "rectangle" ? (
                      <>
                        <rect
                          x={hotspot.geometry.x * SCALE}
                          y={hotspot.geometry.y * SCALE}
                          width={hotspot.geometry.width * SCALE}
                          height={hotspot.geometry.height * SCALE}
                          rx={12}
                          fill={
                            hotspot.presentation === "text"
                              ? "rgba(255,255,255,.88)"
                              : `${color}55`
                          }
                          stroke={color}
                          strokeWidth={2}
                          opacity={locked ? 0.45 : hotspot.opacity ?? 1}
                          vectorEffect="non-scaling-stroke"
                        />
                        {hotspot.presentation === "text" ? (
                          (() => {
                            const textStyle = resolveTextStyle(hotspot.textStyle);
                            return (
                              <text
                                x={textXForAlign(
                                  hotspot.geometry,
                                  SCALE,
                                  textStyle.align,
                                )}
                                y={
                                  (hotspot.geometry.y + hotspot.geometry.height / 2) *
                                  SCALE
                                }
                                textAnchor={textAnchorForAlign(textStyle.align)}
                                dominantBaseline="middle"
                                fill={color}
                                fontSize={textFontSize(
                                  hotspot.geometry.height,
                                  SCALE,
                                  textStyle.role,
                                )}
                                fontFamily="system-ui, sans-serif"
                                fontWeight={textStyle.role === "title" ? 700 : 500}
                                opacity={locked ? 0.45 : hotspot.opacity ?? 1}
                                className="select-none"
                              >
                                {hotspot.labelText?.trim() ||
                                  hotspot.accessibleLabel ||
                                  "Text"}
                              </text>
                            );
                          })()
                        ) : null}
                      </>
                    ) : null
                  ) : (
                    <VisualShape
                      hotspot={hotspot}
                      fill={
                        selected
                          ? `${color}12`
                          : hovered || focused
                            ? `${HOVER_STROKE}18`
                            : "transparent"
                      }
                      stroke={stroke.stroke}
                      strokeWidth={stroke.strokeWidth}
                      opacity={locked ? 0.45 : pulsed ? 0.95 : 1}
                      strokeDasharray={pulsed && !selected ? "10 8" : undefined}
                      filter={
                        selected && style !== "outline"
                          ? `url(#${effectId}-glow)`
                          : undefined
                      }
                      style={
                        pulsed && !selected
                          ? {
                              animation:
                                "explore-hotspot-hint-pulse 1.2s ease-in-out infinite",
                            }
                          : undefined
                      }
                    />
                  )}
                </g>
              </g>
            </svg>
          );
        })}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SCALE} ${SCALE}`}
        preserveAspectRatio="none"
        className="absolute inset-0 z-[1000] h-full w-full"
        style={{ cursor: hoveredId || focusedId ? "pointer" : "default" }}
        onPointerMove={updateHoverFromPointer}
        onPointerLeave={() => setHoveredId(null)}
        onPointerDown={(event) => {
          trySelect(pickHotspotId(pointerPoint(event), selectableHotspots));
        }}
      >
        {selectedHotspot ? (
          <defs>
            <mask id={`${effectId}-spotlight`}>
              <rect width={SCALE} height={SCALE} fill="white" />
              <g transform={svgRotateTransform(selectedHotspot.geometry, selectedHotspot.rotationDeg ?? 0)}>
                <VisualShape hotspot={selectedHotspot} fill="black" />
              </g>
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

        {visibleHotspots.map((hotspot) => {
          const isDecorative = hotspot.interactionKind === "none";
          const locked = lockedSet.has(hotspot.id);
          const interactive = !isDecorative && !locked;
          if (!interactive) return null;
          return (
            <g
              key={`hit-${hotspot.id}`}
              role="button"
              tabIndex={0}
              aria-label={hotspot.accessibleLabel}
              className="outline-none"
              transform={svgRotateTransform(hotspot.geometry, hotspot.rotationDeg ?? 0)}
              onFocus={() => setFocusedId(hotspot.id)}
              onBlur={(event: ReactFocusEvent<SVGGElement>) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setFocusedId((current) => (current === hotspot.id ? null : current));
                }
              }}
              onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  trySelect(hotspot.id);
                }
              }}
            >
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
      <style>{`
        @keyframes explore-hotspot-hint-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        ${OBJECT_ANIMATION_KEYFRAMES_CSS}
      `}</style>
    </div>
  );
}
