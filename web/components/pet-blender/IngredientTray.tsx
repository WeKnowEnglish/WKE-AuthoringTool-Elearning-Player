"use client";

import { clsx } from "clsx";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { DrinkIngredient } from "@/lib/blender/drink-ingredients";

const DRAG_THRESHOLD_PX = 10;

type DragGhost = {
  ingredientId: string;
  emoji: string;
  x: number;
  y: number;
};

type Props = {
  ingredients: DrinkIngredient[];
  disabled?: boolean;
  usedIngredientIds: ReadonlySet<string>;
  dropZoneRef: RefObject<HTMLElement | null>;
  onPick: (ingredientId: string, sourceEl: HTMLElement | null) => void;
};

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function IngredientTray({
  ingredients,
  disabled,
  usedIngredientIds,
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
    item: DrinkIngredient,
  ) => {
    if (disabled || usedIngredientIds.has(item.id)) return;
    e.preventDefault();
    dragIdRef.current = item.id;
    sourceElRef.current = e.currentTarget;
    draggingRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setGhost({
      ingredientId: item.id,
      emoji: item.emoji,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragIdRef.current !== e.currentTarget.dataset.ingredientId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag(e.clientX, e.clientY);
  };

  return (
    <>
      <div
        className="flex flex-wrap justify-center gap-0.5 sm:gap-1"
        role="list"
        aria-label="Ingredients — drag into the blender"
      >
        {ingredients.map((item) => {
          const used = usedIngredientIds.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="listitem"
              data-ingredient-id={item.id}
              disabled={disabled || used}
              className={clsx(
                "flex h-14 w-14 touch-none items-center justify-center rounded-lg bg-transparent text-4xl transition select-none sm:h-16 sm:w-16 sm:text-5xl",
                used ?
                  "cursor-not-allowed scale-90 opacity-35"
                : "cursor-grab hover:scale-110 active:scale-105 active:cursor-grabbing",
                disabled && !used && "pointer-events-none opacity-60",
                ghost?.ingredientId === item.id && draggingActive && "opacity-25",
              )}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerUp={onPointerUp}
              aria-label={`${item.ariaLabel}, drag to blender`}
            >
              <span aria-hidden>{item.emoji}</span>
            </button>
          );
        })}
      </div>

      {ghost && draggingActive ?
        <div
          aria-hidden
          className="pointer-events-none fixed z-[90] text-5xl leading-none drop-shadow-md pet-drink-drag-ghost sm:text-6xl"
          style={{
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {ghost.emoji}
        </div>
      : null}
    </>
  );
}
