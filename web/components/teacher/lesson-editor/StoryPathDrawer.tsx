"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useRef, useState } from "react";

export type PathWaypoint = { x_percent: number; y_percent: number };

type PathPayload = { waypoints: PathWaypoint[]; duration_ms: number };

type Props = {
  imageUrl: string;
  itemXPercent: number;
  itemYPercent: number;
  durationMs: number;
  onDurationChange: (ms: number) => void;
  waypoints: PathWaypoint[] | undefined;
  onCommit: (path: PathPayload | null) => void;
  disabled?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function StoryPathDrawer({
  imageUrl,
  itemXPercent,
  itemYPercent,
  durationMs,
  onDurationChange,
  waypoints,
  onCommit,
  disabled,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [extraPoints, setExtraPoints] = useState<PathWaypoint[]>([]);
  const snapshotRef = useRef<PathPayload | null>(null);

  const fullPath: PathWaypoint[] | null =
    waypoints && waypoints.length >= 2 ? waypoints : null;

  const openDraw = useCallback(() => {
    snapshotRef.current =
      fullPath ? { waypoints: fullPath.map((w) => ({ ...w })), duration_ms: durationMs } : null;
    setExtraPoints(
      fullPath && fullPath.length >= 2 ? fullPath.slice(1).map((w) => ({ ...w })) : [],
    );
    setDrawing(true);
  }, [fullPath, durationMs]);

  const cancelDraw = useCallback(() => {
    const snap = snapshotRef.current;
    if (snap && snap.waypoints.length >= 2) {
      onCommit(snap);
    } else {
      onCommit(null);
    }
    setDrawing(false);
    snapshotRef.current = null;
  }, [onCommit]);

  const commitWithExtra = useCallback(
    (extra: PathWaypoint[], dMs: number) => {
      const full: PathWaypoint[] = [
        { x_percent: itemXPercent, y_percent: itemYPercent },
        ...extra,
      ];
      if (full.length < 2) {
        onCommit(null);
        return;
      }
      onCommit({ waypoints: full, duration_ms: dMs });
    },
    [itemXPercent, itemYPercent, onCommit],
  );

  const closeDone = useCallback(() => {
    commitWithExtra(extraPoints, durationMs);
    setDrawing(false);
    snapshotRef.current = null;
  }, [commitWithExtra, durationMs, extraPoints]);

  const onStagePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawing || disabled) return;
      if (e.button !== 0) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
      setExtraPoints((prev) => {
        const nextExtra = [...prev, { x_percent: x, y_percent: y }];
        commitWithExtra(nextExtra, durationMs);
        return nextExtra;
      });
    },
    [drawing, disabled, durationMs, commitWithExtra],
  );

  const undoLast = useCallback(() => {
    setExtraPoints((prev) => {
      const next = prev.slice(0, -1);
      commitWithExtra(next, durationMs);
      return next;
    });
  }, [durationMs, commitWithExtra]);

  const clearPath = useCallback(() => {
    setExtraPoints([]);
    onCommit(null);
  }, [onCommit]);

  const displayPath: PathWaypoint[] | null =
    drawing && extraPoints.length > 0 ?
      [{ x_percent: itemXPercent, y_percent: itemYPercent }, ...extraPoints]
    : fullPath;

  const linePoints =
    displayPath && displayPath.length >= 2 ?
      displayPath.map((w) => `${w.x_percent},${w.y_percent}`).join(" ")
    : "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!drawing ? (
          <button
            type="button"
            disabled={disabled}
            className="rounded border border-violet-600 bg-violet-50 px-2 py-1 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            onClick={openDraw}
          >
            Draw path
          </button>
        ) : (
          <>
            <span className="text-xs font-medium text-violet-900">
              Click the image to add points (path starts at the item’s top-left).
            </span>
            <button
              type="button"
              disabled={disabled}
              className="rounded border border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
              onClick={undoLast}
            >
              Undo point
            </button>
            <button
              type="button"
              disabled={disabled}
              className="rounded border border-neutral-400 bg-white px-2 py-1 text-xs font-semibold"
              onClick={clearPath}
            >
              Clear path
            </button>
            <button
              type="button"
              disabled={disabled}
              className="rounded border border-emerald-600 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900"
              onClick={closeDone}
            >
              Done
            </button>
            <button
              type="button"
              disabled={disabled}
              className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700"
              onClick={cancelDraw}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <label className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
        Path duration (ms)
        <input
          type="number"
          min={200}
          max={120_000}
          step={100}
          disabled={disabled}
          className="w-24 rounded border px-1 py-0.5 text-sm"
          value={durationMs}
          onChange={(e) => onDurationChange(Number(e.target.value) || 2000)}
        />
      </label>

      <div
        ref={wrapRef}
        className={clsx(
          "relative w-full overflow-hidden rounded border border-neutral-300 bg-neutral-100",
          drawing && !disabled && "cursor-crosshair ring-2 ring-violet-400",
        )}
        onPointerDown={onStagePointerDown}
        onClick={(e) => {
          // Some devices/firefox configurations can drop pointer events intermittently.
          // Keep click as a reliable fallback for adding waypoints.
          if (!drawing || disabled) return;
          const wrap = wrapRef.current;
          if (!wrap) return;
          const rect = wrap.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
          const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
          setExtraPoints((prev) => {
            const hasSameTail =
              prev.length > 0 &&
              Math.abs(prev[prev.length - 1]!.x_percent - x) < 0.001 &&
              Math.abs(prev[prev.length - 1]!.y_percent - y) < 0.001;
            const nextExtra = hasSameTail ? prev : [...prev, { x_percent: x, y_percent: y }];
            commitWithExtra(nextExtra, durationMs);
            return nextExtra;
          });
        }}
        role={drawing ? "application" : undefined}
        aria-label={drawing ? "Click to add path points" : undefined}
      >
        <Image
          src={imageUrl}
          alt=""
          width={800}
          height={450}
          className="pointer-events-none h-auto w-full select-none object-contain"
          draggable={false}
          unoptimized={imageUrl.includes("placehold.co") || imageUrl.includes("supabase.co")}
        />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-600 bg-white shadow"
          style={{
            left: `${itemXPercent}%`,
            top: `${itemYPercent}%`,
          }}
          title="Path start (item)"
        />
        {displayPath && displayPath.length >= 2 ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="rgb(124 58 237)"
              strokeWidth={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              points={linePoints}
            />
            {displayPath.map((w, i) => (
              <circle
                key={`${w.x_percent}-${w.y_percent}-${i}`}
                cx={w.x_percent}
                cy={w.y_percent}
                r={i === 0 ? 0.9 : 0.65}
                fill={i === 0 ? "rgb(124 58 237)" : "white"}
                stroke="rgb(124 58 237)"
                strokeWidth={0.25}
              />
            ))}
          </svg>
        ) : null}
      </div>
      <p className="text-xs text-neutral-600">
        The path uses the item’s <strong>top-left</strong> as the first point. Add one or more
        clicks to build the route. The item animates along this polyline when a timeline or tap
        action runs <strong>move</strong>.
      </p>
    </div>
  );
}
