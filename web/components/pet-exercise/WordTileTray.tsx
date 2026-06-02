"use client";

import { clsx } from "clsx";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { ExerciseTile } from "@/lib/exercise/exercise-tiles";

const DRAG_THRESHOLD_PX = 10;

type DragGhost = {
  tileId: string;
  label: string;
  imageUrl: string;
  x: number;
  y: number;
};

type Props = {
  tiles: ExerciseTile[];
  disabled?: boolean;
  usedTileIds: ReadonlySet<string>;
  dropZoneRef: RefObject<HTMLElement | null>;
  onPick: (tileId: string, sourceEl: HTMLElement | null) => void;
};

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function WordTileTray({
  tiles,
  disabled,
  usedTileIds,
  dropZoneRef,
  onPick,
}: Props) {
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [draggingActive, setDraggingActive] = useState(false);
  const dragIdRef = useRef<string | null>(null);
  const sourceElRef = useRef<HTMLElement | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const id = dragIdRef.current;
      const sourceEl = sourceElRef.current;
      const wasDragging = draggingRef.current;
      dragIdRef.current = null;
      sourceElRef.current = null;
      draggingRef.current = false;
      setDraggingActive(false);
      setGhost(null);

      if (!id || disabled) return;

      if (!wasDragging) {
        onPick(id, sourceEl);
        return;
      }

      const dropEl = dropZoneRef.current;
      if (!dropEl) {
        onPick(id, sourceEl);
        return;
      }

      const dropRect = dropEl.getBoundingClientRect();
      const pointRect = new DOMRect(clientX - 1, clientY - 1, 2, 2);
      if (rectsOverlap(pointRect, dropRect)) {
        onPick(id, sourceEl);
      }
    },
    [disabled, dropZoneRef, onPick],
  );

  useEffect(() => {
    if (!ghost) return;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      if (!draggingRef.current && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        draggingRef.current = true;
        setDraggingActive(true);
      }
      if (draggingRef.current) {
        setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : null));
      }
    };
    const onUp = (e: PointerEvent) => {
      endDrag(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ghost, endDrag]);

  const onPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    item: ExerciseTile,
  ) => {
    if (disabled || usedTileIds.has(item.id)) return;
    e.preventDefault();
    dragIdRef.current = item.id;
    sourceElRef.current = e.currentTarget;
    draggingRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setGhost({
      tileId: item.id,
      label: item.label,
      imageUrl: item.imageUrl,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragIdRef.current !== e.currentTarget.dataset.tileId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag(e.clientX, e.clientY);
  };

  return (
    <>
      <div
        className="grid grid-cols-3 gap-1 sm:gap-1.5"
        role="list"
        aria-label="Word tiles — drag onto the ladder"
      >
        {tiles.map((item) => {
          const used = usedTileIds.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              data-tile-id={item.id}
              disabled={disabled || used}
              className={clsx(
                "relative flex h-14 w-full touch-none items-center justify-center overflow-visible bg-transparent p-0 transition select-none sm:h-16",
                used ?
                  "cursor-not-allowed scale-90 opacity-35"
                : "cursor-grab hover:scale-105 active:scale-100 active:cursor-grabbing",
                disabled && !used && "pointer-events-none opacity-60",
                ghost?.tileId === item.id && draggingActive && "opacity-25",
              )}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerUp={onPointerUp}
              aria-label={`${item.label}, drag to ladder`}
            >
              <Image
                src={item.imageUrl}
                alt=""
                width={120}
                height={56}
                className="h-full w-full object-contain drop-shadow-sm"
                unoptimized
                aria-hidden
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-0.5 text-center text-[9px] font-extrabold leading-tight text-kid-ink sm:text-[10px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {ghost && draggingActive ?
        <div
          aria-hidden
          className="pointer-events-none fixed z-[90] h-14 w-[7rem] drop-shadow-md sm:h-16"
          style={{
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Image
            src={ghost.imageUrl}
            alt=""
            width={120}
            height={56}
            className="h-full w-full object-contain"
            unoptimized
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-kid-ink">
            {ghost.label}
          </span>
        </div>
      : null}
    </>
  );
}
