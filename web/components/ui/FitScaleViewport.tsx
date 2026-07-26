"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Remeasure when this changes (e.g. pack generation / screen index). */
  resetKey?: string | number;
  className?: string;
  contentClassName?: string;
};

/**
 * Lays children out at the viewport width, then scales down uniformly so the
 * full content fits inside the viewport (never upscales past 1).
 */
export function FitScaleViewport({
  children,
  resetKey,
  className = "flex h-full w-full items-center justify-center overflow-hidden",
  contentClassName,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [layoutWidth, setLayoutWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const fit = () => {
      const vw = Math.max(viewport.clientWidth, 1);
      const vh = Math.max(viewport.clientHeight, 1);
      setLayoutWidth((prev) => (Math.abs(prev - vw) < 0.5 ? prev : vw));

      const cw = Math.max(content.scrollWidth, content.offsetWidth, 1);
      const ch = Math.max(content.scrollHeight, content.offsetHeight, 1);
      const next = Math.min(1, vw / cw, vh / ch);
      const safe = Number.isFinite(next) && next > 0 ? next : 1;

      setScale((prev) => (Math.abs(prev - safe) < 0.001 ? prev : safe));
      setSize((prev) =>
        Math.abs(prev.width - cw) < 0.5 && Math.abs(prev.height - ch) < 0.5
          ? prev
          : { width: cw, height: ch },
      );
    };

    fit();
    const viewportObserver = new ResizeObserver(fit);
    viewportObserver.observe(viewport);
    const contentObserver = new ResizeObserver(fit);
    contentObserver.observe(content);
    window.addEventListener("resize", fit);
    const timers = [50, 200, 500, 1000].map((ms) => window.setTimeout(fit, ms));

    return () => {
      viewportObserver.disconnect();
      contentObserver.disconnect();
      window.removeEventListener("resize", fit);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [resetKey]);

  const frameW = size.width * scale;
  const frameH = size.height * scale;

  return (
    <div ref={viewportRef} className={className}>
      <div
        style={{
          width: frameW > 0 ? frameW : "100%",
          height: frameH > 0 ? frameH : "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          ref={contentRef}
          className={contentClassName}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: layoutWidth > 0 ? layoutWidth : "100%",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
