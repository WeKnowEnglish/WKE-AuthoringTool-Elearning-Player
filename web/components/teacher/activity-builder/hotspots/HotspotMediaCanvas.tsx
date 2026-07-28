"use client";

import { useEffect, useRef, useState } from "react";
import {
  contoursToSvgPath,
  geometryCenter,
  normalizeRotationDeg,
  OBJECT_ANIMATION_KEYFRAMES_CSS,
  objectAnimationStyle,
  resolveTextStyle,
  rotationDegreesFromPointer,
  textAnchorForAlign,
  textFontSize,
  textXForAlign,
  unrotatePointAround,
} from "@wke/explore-hotspots-play";
import { startAppDiagnosticSpan } from "@/lib/app-diagnostics/client";
import type { NormalizedSamPrompt } from "@/lib/hotspots/hotspotSegmentation";
import type {
  ActivityAssetReference,
  HotspotElement,
  HotspotGeometry,
  HotspotVisualShape,
  NormalizedPoint,
} from "@/lib/hotspots/types";
import {
  resizeRectangleWithAspect,
  translateRectangle,
} from "@/lib/hotspots/sprite-background";
import { isShapeHotspot, isSpriteHotspot, isTextHotspot } from "@/lib/hotspots/sprites";
import { effectiveZIndex, sortHotspotsBackToFront } from "@/lib/hotspots/layers";

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
  onClearSelection?: () => void;
  onCreate?: (geometry: HotspotGeometry) => void;
  onGeometryChange?: (id: string, geometry: HotspotGeometry) => void;
  onRotationChange?: (id: string, rotationDeg: number) => void;
  segmentationMode?: boolean;
  segmentationPrompts?: NormalizedSamPrompt[];
  segmentationPreview?: HotspotVisualShape | null;
  segmentationPromptLabel?: 1 | 0;
  /** Auto seed markers shown during segmentation (amber). */
  autoSeedPoints?: NormalizedPoint[];
  onSegmentationPrompt?: (prompt: NormalizedSamPrompt) => void;
  onRemoveSegmentationPrompt?: (index: number) => void;
  /** Fit inside a bounded parent (max height + max width) instead of width-driven height. */
  contain?: boolean;
  /** When true, play entrance/idle CSS on the author canvas. */
  motionPreview?: boolean;
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

function spriteRectStyle(geometry: HotspotGeometry, rotationDeg = 0) {
  if (geometry.shape !== "rectangle") return null;
  const rotation = normalizeRotationDeg(rotationDeg);
  return {
    left: `${geometry.x * 100}%`,
    top: `${geometry.y * 100}%`,
    width: `${geometry.width * 100}%`,
    height: `${geometry.height * 100}%`,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: "center center",
  } as const;
}

function svgRotateTransform(geometry: HotspotGeometry, rotationDeg = 0): string | undefined {
  const rotation = normalizeRotationDeg(rotationDeg);
  if (!rotation) return undefined;
  const center = geometryCenter(geometry);
  return `rotate(${rotation} ${center.x * SCALE} ${center.y * SCALE})`;
}

function localPointerForHotspot(
  hotspot: HotspotElement,
  point: NormalizedPoint,
): NormalizedPoint {
  const degrees = normalizeRotationDeg(hotspot.rotationDeg ?? 0);
  if (!degrees) return point;
  return unrotatePointAround(point, geometryCenter(hotspot.geometry), degrees);
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

export function HotspotMediaCanvas({ media, hotspots, spriteSources = {}, spriteAspectRatios = {}, mode, selectedId = null, visitedIds = [], tool = "select", onSelect, onClearSelection, onCreate, onGeometryChange, onRotationChange, segmentationMode = false, segmentationPrompts = [], segmentationPreview = null, segmentationPromptLabel = 1, autoSeedPoints = [], onSegmentationPrompt, onRemoveSegmentationPrompt, contain = false, motionPreview = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const draftStartRef = useRef<NormalizedPoint | null>(null);
  const dragHandleRef = useRef<{ hotspotId: string; index: number } | null>(null);
  const dragMoveRef = useRef<{ hotspotId: string; start: NormalizedPoint; origin: { x: number; y: number; width: number; height: number } } | null>(null);
  const dragRotateRef = useRef<{ hotspotId: string } | null>(null);
  const [gestureActive, setGestureActive] = useState(false);
  const gestureDiagRef = useRef<{
    finish: (detail?: Record<string, string | number | boolean | null | undefined>) => void;
    moveCount: number;
    maxMoveMs: number;
    kind: string;
  } | null>(null);
  const [draftStart, setDraftStart] = useState<NormalizedPoint | null>(null);
  const [draftCurrent, setDraftCurrent] = useState<NormalizedPoint | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<NormalizedPoint[]>([]);

  const stackedHotspots = sortHotspotsBackToFront(hotspots);

  const beginGestureDiag = (kind: string) => {
    if (gestureDiagRef.current) {
      gestureDiagRef.current.finish({ superseded: true });
    }
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "canvas_gesture", {
      kind,
      tool,
      mode,
      segmentationMode,
    });
    gestureDiagRef.current = { finish, moveCount: 0, maxMoveMs: 0, kind };
  };

  const endGestureDiag = (extra?: Record<string, string | number | boolean | null | undefined>) => {
    const gesture = gestureDiagRef.current;
    if (!gesture) return;
    gestureDiagRef.current = null;
    gesture.finish({
      kind: gesture.kind,
      moveCount: gesture.moveCount,
      maxMoveMs: Math.round(gesture.maxMoveMs * 10) / 10,
      tool,
      mode,
      segmentationMode,
      ...extra,
    });
  };

  const pointerPoint = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current!.getBoundingClientRect();
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
    const localPoint = localPointerForHotspot(hotspot, point);
    const geometry = hotspot.geometry;
    if (geometry.shape === "polygon") {
      onGeometryChange?.(hotspot.id, { ...geometry, points: geometry.points.map((candidate, pointIndex) => pointIndex === index ? localPoint : candidate) });
      return;
    }
    if (geometry.shape === "rectangle") {
      const opposite = geometryPoints(geometry)[(index + 2) % 4];
      const aspect = spriteAspectRatios[hotspot.id];
      if (aspect && isSpriteHotspot(hotspot)) {
        onGeometryChange?.(hotspot.id, {
          shape: "rectangle",
          ...resizeRectangleWithAspect(opposite, localPoint, aspect),
        });
        return;
      }
      onGeometryChange?.(hotspot.id, {
        shape: "rectangle",
        x: Math.min(localPoint.x, opposite.x), y: Math.min(localPoint.y, opposite.y),
        width: Math.max(0.01, Math.abs(localPoint.x - opposite.x)), height: Math.max(0.01, Math.abs(localPoint.y - opposite.y)),
      });
      return;
    }
    const opposite = index === 0 ? { x: geometry.cx + geometry.rx, y: geometry.cy + geometry.ry } : { x: geometry.cx - geometry.rx, y: geometry.cy - geometry.ry };
    onGeometryChange?.(hotspot.id, {
      shape: "ellipse",
      cx: (localPoint.x + opposite.x) / 2, cy: (localPoint.y + opposite.y) / 2,
      rx: Math.max(0.005, Math.abs(localPoint.x - opposite.x) / 2), ry: Math.max(0.005, Math.abs(localPoint.y - opposite.y) / 2),
    });
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const moveStartedAt = performance.now();
    const point = pointerPoint(event);
    const activeRotate = dragRotateRef.current;
    if (activeRotate) {
      const hotspot = hotspots.find((candidate) => candidate.id === activeRotate.hotspotId);
      if (hotspot) {
        onRotationChange?.(
          hotspot.id,
          rotationDegreesFromPointer(point, geometryCenter(hotspot.geometry)),
        );
      }
    } else {
      const activeMove = dragMoveRef.current;
      if (activeMove) {
        const hotspot = hotspots.find((candidate) => candidate.id === activeMove.hotspotId);
        if (hotspot?.geometry.shape === "rectangle") {
          const dx = point.x - activeMove.start.x;
          const dy = point.y - activeMove.start.y;
          onGeometryChange?.(hotspot.id, {
            shape: "rectangle",
            ...translateRectangle(activeMove.origin, dx, dy),
          });
        }
      } else {
        const activeHandle = dragHandleRef.current;
        if (activeHandle) {
          const hotspot = hotspots.find((candidate) => candidate.id === activeHandle.hotspotId);
          if (hotspot) updateHandle(hotspot, activeHandle.index, point);
        } else if (draftStartRef.current) setDraftCurrent(point);
      }
    }
    const gesture = gestureDiagRef.current;
    if (gesture) {
      const moveMs = performance.now() - moveStartedAt;
      gesture.moveCount += 1;
      if (moveMs > gesture.maxMoveMs) gesture.maxMoveMs = moveMs;
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (dragRotateRef.current) {
      dragRotateRef.current = null;
      setGestureActive(false);
      if (containerRef.current?.hasPointerCapture(event.pointerId)) {
        containerRef.current.releasePointerCapture(event.pointerId);
      }
      endGestureDiag({ outcome: "rotate" });
      return;
    }
    if (dragMoveRef.current) {
      dragMoveRef.current = null;
      setGestureActive(false);
      if (containerRef.current?.hasPointerCapture(event.pointerId)) {
        containerRef.current.releasePointerCapture(event.pointerId);
      }
      endGestureDiag({ outcome: "sprite_drag" });
      return;
    }
    if (dragHandleRef.current) {
      dragHandleRef.current = null;
      setGestureActive(false);
      if (containerRef.current?.hasPointerCapture(event.pointerId)) {
        containerRef.current.releasePointerCapture(event.pointerId);
      }
      endGestureDiag({ outcome: "handle_resize" });
      return;
    }
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
    if (start) endGestureDiag({ outcome: "draw_shape" });
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
  const aspect = size.width / Math.max(size.height, 1);
  const selectedHotspot = hotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  const selectedTarget = selectedHotspot && !isSpriteHotspot(selectedHotspot) ? selectedHotspot : null;
  const selectedHighlight = selectedTarget?.highlight ?? { style: "spotlight-outline" as const, color: "#fbbf24", outlineWidth: 5, glowRadius: 10, backgroundDim: 0.14 };
  const interactSprites = mode === "author" && tool === "select" && !segmentationMode;
  const showMotionPreview = Boolean(motionPreview && !gestureActive);

  const startSpriteDrag = (
    event: React.PointerEvent<HTMLElement>,
    hotspot: HotspotElement,
  ) => {
    if (!interactSprites || hotspot.geometry.shape !== "rectangle") return;
    event.stopPropagation();
    event.preventDefault();
    onSelect?.(hotspot.id);
    containerRef.current?.setPointerCapture(event.pointerId);
    beginGestureDiag("sprite_drag");
    setGestureActive(true);
    dragMoveRef.current = {
      hotspotId: hotspot.id,
      start: pointerPoint(event),
      origin: hotspot.geometry,
    };
  };

  const startSpriteResize = (
    event: React.PointerEvent<HTMLElement>,
    hotspot: HotspotElement,
    index: number,
  ) => {
    if (!interactSprites) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect?.(hotspot.id);
    containerRef.current?.setPointerCapture(event.pointerId);
    beginGestureDiag("sprite_resize");
    setGestureActive(true);
    dragHandleRef.current = { hotspotId: hotspot.id, index };
  };

  const startTargetHandle = (
    event: React.PointerEvent<SVGCircleElement>,
    hotspot: HotspotElement,
    index: number,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    containerRef.current?.setPointerCapture(event.pointerId);
    beginGestureDiag("target_handle");
    setGestureActive(true);
    dragHandleRef.current = { hotspotId: hotspot.id, index };
  };

  const startRotate = (
    event: React.PointerEvent,
    hotspot: HotspotElement,
  ) => {
    if (!interactSprites) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect?.(hotspot.id);
    containerRef.current?.setPointerCapture(event.pointerId);
    beginGestureDiag("rotate");
    setGestureActive(true);
    dragRotateRef.current = { hotspotId: hotspot.id };
  };

  const spriteHandlePositions = [
    { left: "0%", top: "0%", cursor: "nwse-resize" },
    { left: "100%", top: "0%", cursor: "nesw-resize" },
    { left: "100%", top: "100%", cursor: "nwse-resize" },
    { left: "0%", top: "100%", cursor: "nesw-resize" },
  ] as const;

  const rotateHandleForGeometry = (geometry: HotspotGeometry) => {
    const center = geometryCenter(geometry);
    if (geometry.shape === "rectangle") {
      return { x: center.x, y: geometry.y - Math.max(0.04, geometry.height * 0.12) };
    }
    if (geometry.shape === "ellipse") {
      return { x: center.x, y: geometry.cy - geometry.ry - Math.max(0.04, geometry.ry * 0.25) };
    }
    const topY = Math.min(...geometry.points.map((point) => point.y));
    return { x: center.x, y: topY - 0.04 };
  };
  const effectId = `hotspot-${(selectedId ?? "none").replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <div
      ref={containerRef}
      className={
        contain
          ? "relative max-h-full max-w-full touch-none overflow-hidden rounded-xl bg-slate-900 shadow-2xl"
          : "relative w-full touch-none overflow-hidden rounded-xl bg-slate-900 shadow-2xl"
      }
      style={
        contain
          ? {
              aspectRatio: `${size.width} / ${size.height}`,
              width: `min(100cqw, calc(100cqh * ${aspect}))`,
              height: `min(100cqh, calc(100cqw / ${aspect}))`,
            }
          : { aspectRatio: `${size.width} / ${size.height}` }
      }
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dynamic authoring assets may be data URLs, so the shared canvas intentionally uses a native image element. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt={media.alt ?? "Activity image"} className="absolute inset-0 h-full w-full select-none object-contain" draggable={false} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SCALE} ${SCALE}`}
        preserveAspectRatio="none"
        className={`absolute inset-0 z-10 h-full w-full ${interactSprites ? "pointer-events-none" : ""} ${mode === "author" && tool !== "select" ? "cursor-crosshair" : ""}`}
        onPointerDown={(event) => {
          const point = pointerPoint(event);
          if (mode === "author" && segmentationMode) {
            beginGestureDiag("segmentation_prompt");
            onSegmentationPrompt?.({ ...point, label: event.shiftKey ? 0 : segmentationPromptLabel });
            endGestureDiag({ outcome: "segmentation_prompt" });
            return;
          }
          if (mode !== "author" || event.target !== event.currentTarget) return;
          if (tool === "rectangle" || tool === "ellipse") {
            event.currentTarget.setPointerCapture(event.pointerId);
            beginGestureDiag("draw_shape");
            draftStartRef.current = point;
            setDraftStart(point); setDraftCurrent(point);
          } else if (tool === "polygon") {
            beginGestureDiag("polygon_point");
            setPolygonPoints((current) => [...current, point]);
            endGestureDiag({ outcome: "polygon_point" });
          } else if (tool === "select") {
            onClearSelection?.();
          }
        }}
        onDoubleClick={() => tool === "polygon" && finishPolygon()}
      >
        {selectedTarget && (mode === "play" || segmentationPreview) && <defs>
          <mask id={`${effectId}-spotlight`}>
            <rect width={SCALE} height={SCALE} fill="white" />
            <VisualShape hotspot={selectedTarget} fill="black" />
          </mask>
          <filter id={`${effectId}-glow`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation={selectedHighlight.glowRadius} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>}
        {mode === "play" && selectedTarget && selectedHighlight.style === "spotlight-outline" && <rect width={SCALE} height={SCALE} fill="#020617" opacity={selectedHighlight.backgroundDim} mask={`url(#${effectId}-spotlight)`} className="pointer-events-none" />}
        {mode === "author" && segmentationPreview && selectedTarget ? <VisualShape hotspot={selectedTarget} visualShape={segmentationPreview} fill="rgba(251,191,36,.12)" stroke="#fbbf24" strokeWidth={5} filter={`url(#${effectId}-glow)`} className="pointer-events-none" /> : null}
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
        {draftGeometry && <g className="pointer-events-none fill-sky-400/20 stroke-sky-300" strokeWidth={4}><HotspotShape geometry={draftGeometry} /></g>}
        {polygonPoints.length > 0 && <g className="pointer-events-none"><polyline points={polygonPoints.map((point) => `${point.x * SCALE},${point.y * SCALE}`).join(" ")} fill="rgba(56,189,248,.18)" stroke="#7dd3fc" strokeWidth={4} vectorEffect="non-scaling-stroke" />{polygonPoints.map((point, index) => <circle key={index} cx={point.x * SCALE} cy={point.y * SCALE} r={7} fill="#f8fafc" />)}</g>}
      </svg>

      {/* Objects stacked by zIndex (back → front) so sprites can sit under text/shapes. */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        aria-hidden={mode === "play" ? undefined : true}
      >
        {stackedHotspots.map((hotspot, index) => {
          const stackZ = effectiveZIndex(hotspot, index);
          if (isSpriteHotspot(hotspot)) {
            const spriteSrc = spriteSources[hotspot.id];
            const style = spriteRectStyle(
              hotspot.geometry,
              showMotionPreview ? 0 : hotspot.rotationDeg ?? 0,
            );
            if (!spriteSrc || !style) return null;
            const selected = selectedId === hotspot.id;
            const motion = showMotionPreview
              ? objectAnimationStyle(hotspot.animation, {
                  rotationDeg: hotspot.rotationDeg ?? 0,
                })
              : null;
            const motionKey = showMotionPreview
              ? `${hotspot.id}-${hotspot.animation?.entrance ?? ""}-${hotspot.animation?.idle ?? ""}-${hotspot.animation?.entranceDurationMs ?? ""}-${hotspot.animation?.entranceDelayMs ?? ""}`
              : hotspot.id;
            return (
              <div
                key={motionKey}
                className={`absolute touch-none ${motion ? "explore-object-motion" : ""} ${interactSprites ? "pointer-events-auto cursor-move" : mode === "author" ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                style={{ ...style, ...motion, zIndex: stackZ }}
                onPointerDown={(event) => startSpriteDrag(event, hotspot)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spriteSrc}
                  alt=""
                  draggable={false}
                  className="pointer-events-none h-full w-full select-none object-contain"
                />
                {mode === "author" ? (
                  <div
                    className={`pointer-events-none absolute inset-0 border-2 border-dashed ${selected ? "border-sky-400" : "border-white/35"}`}
                  />
                ) : null}
                {mode === "author" && selected && interactSprites ? (
                  <>
                    {spriteHandlePositions.map((handle, handleIndex) => (
                      <button
                        key={`${hotspot.id}-handle-${handleIndex}`}
                        type="button"
                        aria-label={`Resize sprite corner ${handleIndex + 1}`}
                        className="pointer-events-auto absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-600 bg-white shadow"
                        style={{ left: handle.left, top: handle.top, cursor: handle.cursor }}
                        onPointerDown={(event) => startSpriteResize(event, hotspot, handleIndex)}
                      />
                    ))}
                    <div
                      className="pointer-events-none absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 -translate-y-full bg-sky-500"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      aria-label="Rotate sprite"
                      title="Rotate"
                      className="pointer-events-auto absolute left-1/2 top-0 z-10 h-5 w-5 -translate-x-1/2 -translate-y-[140%] cursor-grab rounded-full border-2 border-sky-600 bg-sky-100 shadow active:cursor-grabbing"
                      onPointerDown={(event) => startRotate(event, hotspot)}
                    />
                  </>
                ) : null}
              </div>
            );
          }

          const selected = selectedId === hotspot.id;
          const visited = visitedIds.includes(hotspot.id);
          const isShape = isShapeHotspot(hotspot);
          const isText = isTextHotspot(hotspot);
          const fillColor = hotspot.highlight?.color ?? "#38bdf8";
          const motion = showMotionPreview
            ? objectAnimationStyle(hotspot.animation)
            : null;
          const hasMotion = Boolean(motion?.animationName);
          const motionKey = showMotionPreview
            ? `${hotspot.id}-${hotspot.animation?.entrance ?? ""}-${hotspot.animation?.idle ?? ""}-${hotspot.animation?.entranceDurationMs ?? ""}-${hotspot.animation?.entranceDelayMs ?? ""}`
            : hotspot.id;
          return (
            <svg
              key={motionKey}
              viewBox={`0 0 ${SCALE} ${SCALE}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              style={{ zIndex: stackZ }}
            >
              <g
                role={mode === "play" ? "button" : undefined}
                tabIndex={mode === "play" ? 0 : undefined}
                aria-label={mode === "play" ? hotspot.accessibleLabel : undefined}
                className={`${mode === "play" ? "cursor-pointer outline-none" : "cursor-default"} group ${interactSprites || mode === "play" ? "pointer-events-auto" : "pointer-events-none"}`}
                transform={svgRotateTransform(hotspot.geometry, hotspot.rotationDeg ?? 0)}
                onClick={(event) => {
                  if (mode === "author" && interactSprites) {
                    event.stopPropagation();
                    if (!segmentationMode) onSelect?.(hotspot.id);
                    return;
                  }
                  event.stopPropagation();
                  if (!segmentationMode) onSelect?.(hotspot.id);
                }}
                onDoubleClick={(event) => {
                  if (mode !== "author" || !interactSprites || segmentationMode) return;
                  event.stopPropagation();
                  onSelect?.(hotspot.id);
                }}
                onKeyDown={(event) => {
                  if (mode === "play" && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelect?.(hotspot.id);
                  }
                }}
              >
                <g
                  className={hasMotion ? "explore-object-motion" : undefined}
                  style={hasMotion ? motion : undefined}
                >
                {mode === "author" && (isShape || isText) ? (
                  <>
                    <HotspotShape
                      geometry={hotspot.geometry}
                      fill={isText ? "rgba(255,255,255,.88)" : `${fillColor}55`}
                      stroke={selected ? "#0ea5e9" : fillColor}
                      strokeWidth={selected ? 4 : 2}
                    />
                    {isText && hotspot.geometry.shape === "rectangle" ? (
                      (() => {
                        const textStyle = resolveTextStyle(hotspot.textStyle);
                        return (
                          <text
                            x={textXForAlign(hotspot.geometry, SCALE, textStyle.align)}
                            y={(hotspot.geometry.y + hotspot.geometry.height / 2) * SCALE}
                            textAnchor={textAnchorForAlign(textStyle.align)}
                            dominantBaseline="middle"
                            fill={hotspot.highlight?.color ?? "#1c1917"}
                            fontSize={textFontSize(
                              hotspot.geometry.height,
                              SCALE,
                              textStyle.role,
                            )}
                            fontFamily="system-ui, sans-serif"
                            fontWeight={textStyle.role === "title" ? 700 : 500}
                            className="pointer-events-none select-none"
                          >
                            {hotspot.labelText?.trim() || hotspot.name || "Text"}
                          </text>
                        );
                      })()
                    ) : null}
                  </>
                ) : mode === "author" ? (
                  <>
                    <VisualShape hotspot={hotspot} fill="transparent" stroke={selected ? "#38bdf8" : "rgba(255,255,255,.42)"} strokeWidth={selected ? 4 : 2} strokeDasharray={hotspot.visualShape ? undefined : "8 7"} />
                    {selected && hotspot.visualShape ? <HotspotShape geometry={hotspot.geometry} fill="transparent" stroke="rgba(56,189,248,.38)" strokeWidth={2} strokeDasharray="8 7" /> : null}
                  </>
                ) : (
                  <VisualShape
                    hotspot={hotspot}
                    fill={selected ? `${hotspot.highlight?.color ?? "#fbbf24"}12` : "transparent"}
                    stroke={selected ? hotspot.highlight?.color ?? "#fbbf24" : visited ? "rgba(52,211,153,.7)" : "transparent"}
                    strokeWidth={selected ? hotspot.highlight?.outlineWidth ?? 5 : visited ? 2 : 3}
                    className="group-hover:stroke-white group-focus:stroke-amber-300"
                  />
                )}
                </g>
                <HotspotShape geometry={hotspot.geometry} fill="transparent" stroke="transparent" strokeWidth={22} />
                <title>{hotspot.accessibleLabel}</title>
              </g>
            </svg>
          );
        })}
      </div>

      <style>{OBJECT_ANIMATION_KEYFRAMES_CSS}</style>

      {/* Target resize / rotate handles above sprites so they stay draggable in Select mode. */}
      {mode === "author" && selectedTarget ? (
        <svg
          viewBox={`0 0 ${SCALE} ${SCALE}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-30 h-full w-full"
          aria-hidden="true"
        >
          <g transform={svgRotateTransform(selectedTarget.geometry, selectedTarget.rotationDeg ?? 0)}>
            {geometryPoints(selectedTarget.geometry).map((point, index) => {
              const svgPoint = toSvg(point);
              return (
                <circle
                  key={`${selectedTarget.id}-handle-${index}`}
                  cx={svgPoint.x}
                  cy={svgPoint.y}
                  r={10}
                  fill="#f8fafc"
                  stroke="#0284c7"
                  strokeWidth={4}
                  vectorEffect="non-scaling-stroke"
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(event) => startTargetHandle(event, selectedTarget, index)}
                />
              );
            })}
            {interactSprites ? (() => {
              const rotateAt = rotateHandleForGeometry(selectedTarget.geometry);
              const center = geometryCenter(selectedTarget.geometry);
              const handle = toSvg(rotateAt);
              const pivot = toSvg(center);
              return (
                <g key={`${selectedTarget.id}-rotate`}>
                  <line
                    x1={pivot.x}
                    y1={Math.min(pivot.y, handle.y + 12)}
                    x2={handle.x}
                    y2={handle.y}
                    stroke="#0284c7"
                    strokeWidth={3}
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-none"
                  />
                  <circle
                    cx={handle.x}
                    cy={handle.y}
                    r={11}
                    fill="#e0f2fe"
                    stroke="#0284c7"
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-auto cursor-grab"
                    onPointerDown={(event) => startRotate(event, selectedTarget)}
                  >
                    <title>Rotate</title>
                  </circle>
                </g>
              );
            })() : null}
          </g>
        </svg>
      ) : null}
    </div>
  );
}
