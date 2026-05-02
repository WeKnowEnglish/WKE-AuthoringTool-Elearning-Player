"use client";

import { clsx } from "clsx";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Matches `max-w-5xl` in LessonPlayer so preview lays out like the live player width cap. */
const PREVIEW_LAYOUT_MAX_PX = 1024;

type Props = {
  children: ReactNode;
  /** When this changes, layout is re-measured (e.g. screen switch or live payload edits). */
  measureKey?: string | number;
  className?: string;
};

/**
 * Scales lesson preview content down so the full player fits the available box without scrolling.
 * Uses the same max content width as the student player (5xl cap).
 */
export function FitScaledLessonPreview({
  children,
  measureKey = "",
  className,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [[scale, clipW, clipH], setFit] = useState<[number, number, number]>([
    1, 0, 0,
  ]);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const ow = outer.clientWidth;
    const oh = outer.clientHeight;
    if (ow < 8 || oh < 8) return;

    const targetW = Math.min(PREVIEW_LAYOUT_MAX_PX, ow);
    inner.style.width = `${targetW}px`;

    const iw = inner.scrollWidth;
    const ih = inner.scrollHeight;
    if (iw < 1 || ih < 1) return;

    const s = Math.min(ow / iw, oh / ih, 1);
    const cw = Math.max(1, Math.round(iw * s));
    const ch = Math.max(1, Math.round(ih * s));
    setFit((prev) =>
      prev[0] === s && prev[1] === cw && prev[2] === ch ? prev : [s, cw, ch],
    );
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, measureKey]);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(outer);
    return () => ro.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={outerRef}
      className={clsx("flex min-h-0 w-full flex-1 flex-col overflow-hidden", className)}
    >
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
        <div
          className="overflow-hidden"
          style={
            clipW > 0 && clipH > 0 ?
              { width: clipW, height: clipH }
            : { width: "100%", height: "100%", minHeight: 120 }
          }
        >
          <div
            ref={innerRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
