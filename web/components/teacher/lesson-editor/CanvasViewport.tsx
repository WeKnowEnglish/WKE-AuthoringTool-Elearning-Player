"use client";

import { clsx } from "clsx";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export type CanvasViewportHandle = {
  resetView: () => void;
};

export type CanvasViewportProps = {
  children: ReactNode;
  disabled?: boolean;
  /** When false, panned/scaled content may extend past the viewport (story editor off-stage items). */
  clip?: boolean;
};

export const CanvasViewport = forwardRef<CanvasViewportHandle, CanvasViewportProps>(
  function CanvasViewport({ children, disabled, clip = true }, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const panRef = useRef(pan);
    const spaceDownRef = useRef(false);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panPointerRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      panX: number;
      panY: number;
    } | null>(null);

    useEffect(() => {
      panRef.current = pan;
    }, [pan]);

    useImperativeHandle(ref, () => ({
      resetView: () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      },
    }));

    useEffect(() => {
      const el = rootRef.current;
      if (!el || disabled) return;
      const onWheel = (e: WheelEvent) => {
        if (!el.contains(e.target as Node)) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        setZoom((z) => clamp(z * factor, 0.25, 3));
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, [disabled]);

    useEffect(() => {
      const skipSpacePan = (t: EventTarget | null) => {
        const el = t as HTMLElement | null;
        return !!el?.closest(
          "input, textarea, select, [contenteditable='true'], button, a[href], [role='button'], [role='link']",
        );
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code !== "Space") return;
        if (skipSpacePan(e.target)) return;
        e.preventDefault();
        spaceDownRef.current = true;
        setSpaceHeld(true);
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code !== "Space") return;
        spaceDownRef.current = false;
        setSpaceHeld(false);
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, []);

    function startPan(e: ReactPointerEvent) {
      if (disabled) return;
      const cur = panRef.current;
      panPointerRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        panX: cur.x,
        panY: cur.y,
      };
      setIsPanning(true);

      const onMove = (ev: PointerEvent) => {
        const p = panPointerRef.current;
        if (!p || ev.pointerId !== p.pointerId) return;
        setPan({
          x: p.panX + (ev.clientX - p.startX),
          y: p.panY + (ev.clientY - p.startY),
        });
      };
      const onUp = (ev: PointerEvent) => {
        const p = panPointerRef.current;
        if (!p || ev.pointerId !== p.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        panPointerRef.current = null;
        setIsPanning(false);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }

    const onTransformPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.button === 1) {
        e.preventDefault();
        startPan(e);
        return;
      }
      if (e.button === 0 && spaceDownRef.current) {
        const t = e.target as HTMLElement | null;
        if (t?.closest("[data-region-editor-item='true']")) return;
        e.preventDefault();
        startPan(e);
      }
    };

    return (
      <div
        ref={rootRef}
        className={clsx(
          "relative w-full min-h-0 max-w-full rounded-md",
          clip ? "overflow-hidden" : "overflow-visible",
        )}
      >
        <div
          ref={transformRef}
          onPointerDown={onTransformPointerDown}
          className={clsx(
            isPanning && "cursor-grabbing",
            !isPanning && spaceHeld && "cursor-grab",
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {children}
        </div>
      </div>
    );
  },
);
