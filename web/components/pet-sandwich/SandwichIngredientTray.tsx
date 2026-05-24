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
import type { SandwichIngredient } from "@/lib/sandwich/sandwich-ingredients";

const DRAG_THRESHOLD_PX = 10;

type DragGhost = {
  ingredientId: string;
  imageUrl: string;
  x: number;
  y: number;
};

type Props = {
  ingredients: SandwichIngredient[];
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

export function SandwichIngredientTray({
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
    item: SandwichIngredient,
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
      imageUrl: item.imageUrl,
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
        className="grid grid-cols-3 gap-1 sm:gap-1.5"
        role="list"
        aria-label="Sandwich ingredients — drag onto the sandwich"
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
                "flex h-16 w-full touch-none items-center justify-center overflow-visible bg-transparent p-0 transition select-none sm:h-[4.5rem]",
                used ?
                  "cursor-not-allowed scale-90 opacity-35"
                : "cursor-grab hover:scale-110 active:scale-105 active:cursor-grabbing",
                disabled && !used && "pointer-events-none opacity-60",
                ghost?.ingredientId === item.id && draggingActive && "opacity-25",
              )}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerUp={onPointerUp}
              aria-label={`${item.ariaLabel}, drag to sandwich`}
            >
              <Image
                src={item.imageUrl}
                alt=""
                width={80}
                height={80}
                className="max-h-[3.25rem] w-auto max-w-[92%] object-contain drop-shadow-sm sm:max-h-[3.75rem]"
                unoptimized
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {ghost && draggingActive ?
        <div
          aria-hidden
          className="pointer-events-none fixed z-[90] h-16 w-16 drop-shadow-md sm:h-[4.5rem] sm:w-[4.5rem]"
          style={{
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Image
            src={ghost.imageUrl}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-contain"
            unoptimized
          />
        </div>
      : null}
    </>
  );
}
