"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

const DRAG_THRESHOLD_PX = 8;
const SNAP_TOLERANCE_PX = 4;
/** After native scroll / momentum stops, align to the nearest card. */
const SCROLL_SETTLE_MS = 100;

type Props = {
  /** Stable id fragment for headings (avoids duplicate ids when title repeats). */
  sectionId: string;
  /** Visible section title (e.g. A1). */
  title: string;
  children: ReactNode;
  /** When true, show a short hint that the row scrolls horizontally. */
  showScrollHint?: boolean;
};

type DragState =
  | { phase: "idle" }
  | { phase: "pending"; startX: number; startScroll: number; pointerId: number }
  | { phase: "dragging"; startX: number; startScroll: number; pointerId: number };

function clearSnapOverride(rail: HTMLDivElement | null) {
  if (!rail) return;
  rail.style.removeProperty("scroll-snap-type");
}

/**
 * Horizontal gallery: 1:1 pointer drag (follows cursor), touch/trackpad scroll,
 * snap disabled during drag so nothing fights the gesture, then smooth align to a card when done.
 */
export function ActivityLevelCarousel({ sectionId, title, children, showScrollHint = true }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({ phase: "idle" });
  const selectBlockRef = useRef(false);
  const gestureListenersRef = useRef<(() => void) | null>(null);

  const clearSelectBlock = useCallback(() => {
    if (!selectBlockRef.current) return;
    selectBlockRef.current = false;
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
  }, []);

  const applySelectBlock = useCallback(() => {
    if (selectBlockRef.current) return;
    selectBlockRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  }, []);

  const clearGestureListeners = useCallback(() => {
    gestureListenersRef.current?.();
    gestureListenersRef.current = null;
  }, []);

  const nearestSnapScrollLeft = useCallback((el: HTMLDivElement): number => {
    const { children: items } = el;
    if (items.length === 0) return el.scrollLeft;
    const sl = el.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const left = (items[i] as HTMLElement).offsetLeft;
      const d = Math.abs(left - sl);
      if (d < bestDist) {
        bestDist = d;
        best = left;
      }
    }
    return best;
  }, []);

  const alignToNearestCard = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = railRef.current;
      if (!el || el.children.length === 0) return;
      const target = nearestSnapScrollLeft(el);
      if (Math.abs(el.scrollLeft - target) <= SNAP_TOLERANCE_PX) return;
      el.scrollTo({ left: target, behavior });
    },
    [nearestSnapScrollLeft],
  );

  useEffect(() => () => clearGestureListeners(), [clearGestureListeners]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const rail = railRef.current;
      if (!rail) return;

      clearGestureListeners();
      clearSnapOverride(rail);

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startScroll = rail.scrollLeft;
      dragRef.current = { phase: "pending", startX, startScroll, pointerId };

      const onDocMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const state = dragRef.current;
        if (state.phase === "idle") return;
        const el = railRef.current;
        if (!el) return;

        const dx = ev.clientX - state.startX;
        el.style.scrollSnapType = "none";
        el.scrollLeft = state.startScroll - dx;

        if (state.phase === "pending") {
          if (Math.abs(dx) >= DRAG_THRESHOLD_PX) {
            applySelectBlock();
            dragRef.current = {
              phase: "dragging",
              startX: state.startX,
              startScroll: state.startScroll,
              pointerId: state.pointerId,
            };
          }
          return;
        }

        if (state.phase === "dragging" && ev.cancelable) {
          ev.preventDefault();
        }
      };

      const onDocEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        const state = dragRef.current;
        const el = railRef.current;
        dragRef.current = { phase: "idle" };

        clearGestureListeners();

        if (state.phase === "pending") {
          const dx = ev.clientX - state.startX;
          if (Math.abs(dx) < DRAG_THRESHOLD_PX && el) {
            el.scrollLeft = state.startScroll;
          }
          clearSnapOverride(el);
          return;
        }

        if (state.phase === "dragging") {
          clearSelectBlock();
          clearSnapOverride(el);
          requestAnimationFrame(() => alignToNearestCard("smooth"));
        }
      };

      const moveOpts: AddEventListenerOptions = { capture: true, passive: false };
      const endOpts: AddEventListenerOptions = { capture: true };
      document.addEventListener("pointermove", onDocMove, moveOpts);
      document.addEventListener("pointerup", onDocEnd, endOpts);
      document.addEventListener("pointercancel", onDocEnd, endOpts);

      gestureListenersRef.current = () => {
        document.removeEventListener("pointermove", onDocMove, moveOpts);
        document.removeEventListener("pointerup", onDocEnd, endOpts);
        document.removeEventListener("pointercancel", onDocEnd, endOpts);
      };
    },
    [alignToNearestCard, applySelectBlock, clearGestureListeners, clearSelectBlock],
  );

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSettleAlign = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const phase = dragRef.current.phase;
        if (phase === "pending" || phase === "dragging") return;
        alignToNearestCard("smooth");
      }, SCROLL_SETTLE_MS);
    };

    el.addEventListener("scroll", scheduleSettleAlign, { passive: true });

    return () => {
      el.removeEventListener("scroll", scheduleSettleAlign);
      clearTimeout(settleTimer);
    };
  }, [alignToNearestCard]);

  const headingId = `level-heading-${sectionId}`;

  return (
    <section className="space-y-2" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={headingId}
          className="text-lg font-bold tracking-tight text-neutral-900"
        >
          {title}
        </h2>
        {showScrollHint ?
          <p className="text-[11px] font-medium text-neutral-500">Drag or swipe sideways to see more</p>
        : null}
      </div>
      <div
        ref={railRef}
        className="-mx-1 flex cursor-grab touch-pan-x snap-x snap-proximity gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain px-1 pb-2 pt-1 [scrollbar-gutter:stable] active:cursor-grabbing"
        style={{ WebkitOverflowScrolling: "touch" }}
        onPointerDown={onPointerDown}
      >
        {children}
      </div>
    </section>
  );
}
