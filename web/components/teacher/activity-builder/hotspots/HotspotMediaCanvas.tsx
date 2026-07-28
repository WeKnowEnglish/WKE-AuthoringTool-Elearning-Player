"use client";

import { useEffect, useRef, useState } from "react";
import { contoursToSvgPath } from "@wke/explore-hotspots-play";
import type { NormalizedSamPrompt } from "@/lib/hotspots/hotspotSegmentation";
import type {
  ActivityAssetReference,
  HotspotElement,
  HotspotGeometry,
  HotspotVisualShape,
  NormalizedPoint,
} from "@/lib/hotspots/types";
import { resizeRectangleWithAspect } from "@/lib/hotspots/sprite-background";
import { isSpriteHotspot } from "@/lib/hotspots/sprites";

export type HotspotCanvasTool = "select" | "rectangle" | "ellipse" | "polygon";

type Props = {
  media: ActivityAssetReference;
  hotspots: HotspotElement[];
  /** Resolved sprite image src keyed by hotspot id. */
  spriteSources?: Record<string, string>;
  /** Normalized width/height ratio (scene space) for aspect-locked sprite resize. */
  spriteAspectRatios?: Record<string, number>;
  mode: "author" | "play";
  selectedId?: string | null;
  visitedIds?: string[];
  tool?: HotspotCanvasTool;
  onSelect?: (id: string) => void;
  onCreate?: (geometry: HotspotGeometry) => void;
  onGeometryChange?: (id: string, geometry: HotspotGeometry) => void;
  segmentationMode?: boolean;
  segmentationPrompts?: NormalizedSamPrompt[];
  segmentationPreview?: HotspotVisualShape | null;
  segmentationPromptLabel?: 1 | 0;
  /** Auto seed markers shown during segmentation (amber). */
  autoSeedPoints?: NormalizedPoint[];
  onSegmentationPrompt?: (prompt: NormalizedSamPrompt) => void;
  onRemoveSegmentationPrompt?: (index: number) => void;
};

const SCALE = 1000;
const toSvg = (point: NormalizedPoint) => ({ x: point.x * SCALE, y: point.y * SCALE });

function geometryPoints(geometry: HotspotGeometry): NormalizedPoint[] {
  if (geometry.shape === "rectangle") return [
    { x: geometry.x, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
    { x: geometry.x, y: geometry.y + geometry.height },
  ];
  if (geometry.shape === "ellipse") return [
    { x: geometry.cx - geometry.rx, y: geometry.cy - geometry.ry },
    { x: geometry.cx + geometry.rx, y: geometry.cy + geometry.ry },
  ];
  return geometry.points;
}

type ShapeStyle = { className?: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number; filter?: string; strokeDasharray?: string };

function HotspotShape({ geometry, ...style }: { geometry: HotspotGeometry } & ShapeStyle) {
  if (geometry.shape === "rectangle") return <rect {...style} x={geometry.x * SCALE} y={geometry.y * SCALE} width={geometry.width * SCALE} height={geometry.height * SCALE} rx={12} vectorEffect="non-scaling-stroke" />;
  if (geometry.shape === "ellipse") return <ellipse {...style} cx={geometry.cx * SCALE} cy={geometry.cy * SCALE} rx={geometry.rx * SCALE} ry={geometry.ry * SCALE} vectorEffect="non-scaling-stroke" />;
  return <polygon {...style} points={geometry.points.map((point) => `${point.x * SCALE},${point.y * SCALE}`).join(" ")} vectorEffect="non-scaling-stroke" />;
}

function VisualShape({ hotspot, visualShape, ...style }: { hotspot: HotspotElement; visualShape?: HotspotVisualShape } & ShapeStyle) {
  const precise = visualShape ?? hotspot.visualShape;
  if (precise?.paths.length) return <path {...style} d={contoursToSvgPath(precise.paths, SCALE)} fillRule="evenodd" clipRule="evenodd" vectorEffect="non-scaling-stroke" />;
  return <HotspotShape geometry={hotspot.geometry} {...style} />;
}

export function HotspotMediaCanvas({ media, hotspots, spriteSources = {}, spriteAspectRatios = {}, mode, selectedId = null, visitedIds = [], tool = "select", onSelect, onCreate, onGeometryChange, segmentationMode = false, segmentationPrompts = [], segmentationPreview = null, segmentationPromptLabel = 1, autoSeedPoints = [], onSegmentationPrompt, onRemoveSegmentationPrompt }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draftStartRef = useRef<NormalizedPoint | null>(null);
  const dragHandleRef = useRef<{ hotspotId: string; index: number } | null>(null);
  const [draftStart, setDraftStart] = useState<NormalizedPoint | null>(null);
  const [draftCurrent, setDraftCurrent] = useState<NormalizedPoint | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<NormalizedPoint[]>([]);

  const pointerPoint = (event: React.PointerEvent<SVGSVGElement | SVGCircleElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };

  const finishPolygon = () => {
    if (polygonPoints.length >= 3) onCreate?.({ shape: "polygon", points: polygonPoints });
    setPolygonPoints([]);
  };

  useEffect(() => {
    if (mode !== "author" || tool !== "polygon") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") finishPolygon();
      if (event.key === "Escape") setPolygonPoints([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const updateHandle = (hotspot: HotspotElement, index: number, point: NormalizedPoint) => {
    const geometry = hotspot.geometry;
    if (geometry.shape === "polygon") {
      onGeometryChange?.(hotspot.id, { ...geometry, points: geometry.points.map((candidate, pointIndex) => pointIndex === index ? point : candidate) });
      return;
    }
    if (geometry.shape === "rectangle") {
      const opposite = geometryPoints(geometry)[(index + 2) % 4];
      const aspect = spriteAspectRatios[hotspot.id];
      if (aspect && isSpriteHotspot(hotspot)) {
        onGeometryChange?.(hotspot.id, {
          shape: "rectangle",
          ...resizeRectangleWithAspect(opposite, point, aspect),
        });
        return;
      }
      onGeometryChange?.(hotspot.id, {
        shape: "rectangle",
        x: Math.min(point.x, opposite.x), y: Math.min(point.y, opposite.y),
        width: Math.max(0.01, Math.abs(point.x - opposite.x)), height: Math.max(0.01, Math.abs(point.y - opposite.y)),
      });
      return;
    }
    const opposite = index === 0 ? { x: geometry.cx + geometry.rx, y: geometry.cy + geometry.ry } : { x: geometry.cx - geometry.rx, y: geometry.cy - geometry.ry };
    onGeometryChange?.(hotspot.id, {
      shape: "ellipse",
      cx: (point.x + opposite.x) / 2, cy: (point.y + opposite.y) / 2,
      rx: Math.max(0.005, Math.abs(point.x - opposite.x) / 2), ry: Math.max(0.005, Math.abs(point.y - opposite.y) / 2),
    });
  };

  const draftGeometry = draftStart && draftCurrent ? (tool === "ellipse" ? {
    shape: "ellipse" as const,
    cx: (draftStart.x + draftCurrent.x) / 2,
    cy: (draftStart.y + draftCurrent.y) / 2,
    rx: Math.abs(draftCurrent.x - draftStart.x) / 2,
    ry: Math.abs(draftCurrent.y - draftStart.y) / 2,
  } : {
    shape: "rectangle" as const,
    x: Math.min(draftStart.x, draftCurrent.x), y: Math.min(draftStart.y, draftCurrent.y),
    width: Math.abs(draftCurrent.x - draftStart.x), height: Math.abs(draftCurrent.y - draftStart.y),
  }) : null;

  const size = media.intrinsicSize ?? { width: 16, height: 9 };
  const selectedHotspot = hotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  const selectedHighlight = selectedHotspot?.highlight ?? { style: "spotlight-outline" as const, color: "#fbbf24", outlineWidth: 5, glowRadius: 10, backgroundDim: 0.14 };
  const effectId = `hotspot-${(selectedId ?? "none").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-slate-900 shadow-2xl" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
      {/* Dynamic authoring assets may be data URLs, so the shared canvas intentionally uses a native image element. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt={media.alt ?? "Activity image"} className="absolute inset-0 h-full w-full select-none object-contain" draggable={false} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SCALE} ${SCALE}`}
        preserveAspectRatio="xMidYMid meet"
        className={`absolute inset-0 h-full w-full ${mode === "author" && tool !== "select" ? "cursor-crosshair" : ""}`}
        onPointerDown={(event) => {
          const point = pointerPoint(event);
          if (mode === "author" && segmentationMode) {
            onSegmentationPrompt?.({ ...point, label: event.shiftKey ? 0 : segmentationPromptLabel });
            return;
          }
          if (mode !== "author" || event.target !== event.currentTarget) return;
          if (tool === "rectangle" || tool === "ellipse") {
            event.currentTarget.setPointerCapture(event.pointerId);
            draftStartRef.current = point;
            setDraftStart(point); setDraftCurrent(point);
          } else if (tool === "polygon") setPolygonPoints((current) => [...current, point]);
        }}
        onPointerMove={(event) => {
          const point = pointerPoint(event);
          const activeHandle = dragHandleRef.current;
          if (activeHandle) {
            const hotspot = hotspots.find((candidate) => candidate.id === activeHandle.hotspotId);
            if (hotspot) updateHandle(hotspot, activeHandle.index, point);
          } else if (draftStartRef.current) setDraftCurrent(point);
        }}
        onPointerUp={(event) => {
          if (dragHandleRef.current) { dragHandleRef.current = null; return; }
          const start = draftStartRef.current;
          const end = pointerPoint(event);
          const committed = start ? (tool === "ellipse" ? {
            shape: "ellipse" as const, cx: (start.x + end.x) / 2, cy: (start.y + end.y) / 2,
            rx: Math.abs(end.x - start.x) / 2, ry: Math.abs(end.y - start.y) / 2,
          } : {
            shape: "rectangle" as const, x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y),
          }) : null;
          if (committed && (committed.shape === "ellipse" ? committed.rx > 0 && committed.ry > 0 : committed.width > 0 && committed.height > 0)) onCreate?.(committed);
          draftStartRef.current = null;
          setDraftStart(null); setDraftCurrent(null);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onDoubleClick={() => tool === "polygon" && finishPolygon()}
      >
        {selectedHotspot && (mode === "play" || segmentationPreview) && <defs>
          <mask id={`${effectId}-spotlight`}>
            <rect width={SCALE} height={SCALE} fill="white" />
            <VisualShape hotspot={selectedHotspot} fill="black" />
          </mask>
          <filter id={`${effectId}-glow`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation={selectedHighlight.glowRadius} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>}
        {mode === "play" && selectedHotspot && selectedHighlight.style === "spotlight-outline" && <rect width={SCALE} height={SCALE} fill="#020617" opacity={selectedHighlight.backgroundDim} mask={`url(#${effectId}-spotlight)`} className="pointer-events-none" />}
        {hotspots.map((hotspot) => {
          const selected = selectedId === hotspot.id;
          const visited = visitedIds.includes(hotspot.id);
          const sprite = isSpriteHotspot(hotspot);
          const spriteSrc = spriteSources[hotspot.id];
          const rect =
            hotspot.geometry.shape === "rectangle" ? hotspot.geometry : null;
          return (
            <g
              key={hotspot.id}
              role={mode === "play" ? "button" : undefined}
              tabIndex={mode === "play" ? 0 : undefined}
              aria-label={mode === "play" ? hotspot.accessibleLabel : undefined}
              className={`${mode === "play" ? "cursor-pointer outline-none" : "cursor-default"} group`}
              onClick={(event) => { event.stopPropagation(); if (!segmentationMode) onSelect?.(hotspot.id); }}
              onKeyDown={(event) => { if (mode === "play" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect?.(hotspot.id); } }}
            >
              {sprite && spriteSrc && rect ? (
                <image
                  href={spriteSrc}
                  x={rect.x * SCALE}
                  y={rect.y * SCALE}
                  width={rect.width * SCALE}
                  height={rect.height * SCALE}
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none"
                />
              ) : null}
              {mode === "author" ? <>
                {sprite && rect ? (
                  <rect
                    x={rect.x * SCALE}
                    y={rect.y * SCALE}
                    width={rect.width * SCALE}
                    height={rect.height * SCALE}
                    fill="transparent"
                    stroke={selected ? "#38bdf8" : "rgba(255,255,255,.35)"}
                    strokeWidth={selected ? 3 : 2}
                    strokeDasharray="8 6"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  <>
                    <VisualShape hotspot={hotspot} fill="transparent" stroke={selected ? "#38bdf8" : "rgba(255,255,255,.42)"} strokeWidth={selected ? 4 : 2} strokeDasharray={hotspot.visualShape ? undefined : "8 7"} />
                    {selected && hotspot.visualShape && <HotspotShape geometry={hotspot.geometry} fill="transparent" stroke="rgba(56,189,248,.38)" strokeWidth={2} strokeDasharray="8 7" />}
                  </>
                )}
              </> : !sprite ? <VisualShape
                hotspot={hotspot}
                fill={selected ? `${hotspot.highlight?.color ?? "#fbbf24"}12` : "transparent"}
                stroke={selected ? hotspot.highlight?.color ?? "#fbbf24" : visited ? "rgba(52,211,153,.7)" : "transparent"}
                strokeWidth={selected ? hotspot.highlight?.outlineWidth ?? 5 : visited ? 2 : 3}
                filter={selected && (hotspot.highlight?.style ?? "spotlight-outline") !== "outline" ? `url(#${effectId}-glow)` : undefined}
                className="group-hover:stroke-white group-focus:stroke-amber-300"
              /> : null}
              <HotspotShape geometry={hotspot.geometry} fill="transparent" stroke="transparent" strokeWidth={22} />
              <title>{hotspot.accessibleLabel}</title>
            </g>
          );
        })}
        {mode === "author" && segmentationPreview && selectedHotspot && <VisualShape hotspot={selectedHotspot} visualShape={segmentationPreview} fill="rgba(251,191,36,.12)" stroke="#fbbf24" strokeWidth={5} filter={`url(#${effectId}-glow)`} className="pointer-events-none" />}
        {mode === "author" && segmentationMode && autoSeedPoints.map((seed, index) => {
          const cx = seed.x * SCALE;
          const cy = seed.y * SCALE;
          return (
            <g key={`auto-seed-${index}`} className="pointer-events-none" aria-hidden="true">
              <circle cx={cx} cy={cy} r={10} fill="rgba(251,191,36,.35)" stroke="#fbbf24" strokeWidth={3} vectorEffect="non-scaling-stroke" />
              <circle cx={cx} cy={cy} r={3} fill="#fbbf24" />
            </g>
          );
        })}
        {mode === "author" && segmentationPrompts.map((prompt, index) => {
          const cx = prompt.x * SCALE;
          const cy = prompt.y * SCALE;
          const include = prompt.label === 1;
          const glyph = include
            ? `M${cx - 6} ${cy} H${cx + 6} M${cx} ${cy - 6} V${cy + 6}`
            : `M${cx - 6} ${cy} H${cx + 6}`;
          return (
            <g
              key={`${prompt.x}-${prompt.y}-${index}`}
              role="button"
              tabIndex={0}
              aria-label={`Remove ${include ? "include" : "exclude"} refinement point ${index + 1}`}
              className="cursor-pointer outline-none"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveSegmentationPrompt?.(index);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemoveSegmentationPrompt?.(index);
                }
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={14}
                fill={include ? "#34d399" : "#fb7185"}
                stroke="#fff"
                strokeWidth={4}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={glyph}
                stroke="#fff"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
                className="pointer-events-none"
              />
              <title>{`Remove ${include ? "include" : "exclude"} point ${index + 1}`}</title>
            </g>
          );
        })}
        {mode === "author" && hotspots.filter((hotspot) => hotspot.id === selectedId).map((hotspot) => geometryPoints(hotspot.geometry).map((point, index) => {
          const svgPoint = toSvg(point);
          return <circle key={`${hotspot.id}-${index}`} cx={svgPoint.x} cy={svgPoint.y} r={10} fill="#f8fafc" stroke="#0284c7" strokeWidth={4} vectorEffect="non-scaling-stroke" className="cursor-move" onPointerDown={(event) => { event.stopPropagation(); svgRef.current?.setPointerCapture(event.pointerId); dragHandleRef.current = { hotspotId: hotspot.id, index }; }} />;
        }))}
        {draftGeometry && <g className="pointer-events-none fill-sky-400/20 stroke-sky-300" strokeWidth={4}><HotspotShape geometry={draftGeometry} /></g>}
        {polygonPoints.length > 0 && <g className="pointer-events-none"><polyline points={polygonPoints.map((point) => `${point.x * SCALE},${point.y * SCALE}`).join(" ")} fill="rgba(56,189,248,.18)" stroke="#7dd3fc" strokeWidth={4} vectorEffect="non-scaling-stroke" />{polygonPoints.map((point, index) => <circle key={index} cx={point.x * SCALE} cy={point.y * SCALE} r={7} fill="#f8fafc" />)}</g>}
      </svg>
    </div>
  );
}
