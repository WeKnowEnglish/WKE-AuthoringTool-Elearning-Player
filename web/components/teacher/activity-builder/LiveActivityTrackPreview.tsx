"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityTrackDocument } from "@/lib/activity-tracks";

type Props = {
  document: ActivityTrackDocument;
  focusPartId?: string | null;
  device: "desktop" | "tablet" | "mobile";
};

type PreviewBounds = {
  width: number;
  height: number;
};

export function LiveActivityTrackPreview({
  document,
  focusPartId = null,
  device,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [bounds, setBounds] = useState<PreviewBounds>({ width: 0, height: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setBounds({
        width: Math.max(0, entry.contentRect.width),
        height: Math.max(0, entry.contentRect.height),
      });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const sendDocument = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      {
        type: "wke-activity-track-preview",
        document,
        focusPartId,
      },
      window.location.origin,
    );
  }, [document, focusPartId]);

  useEffect(() => {
    sendDocument();
  }, [sendDocument]);

  const viewportWidth =
    device === "mobile" ? 390 : device === "tablet" ? 768 : 1024;
  const frameChromeWidth = device === "mobile" ? 12 : 2;
  const scale =
    bounds.width > 0
      ? Math.min(1, Math.max(0, bounds.width - frameChromeWidth) / viewportWidth)
      : 1;
  const visibleWidth = viewportWidth * scale;
  const frameWidth = visibleWidth + frameChromeWidth;
  const viewportHeight =
    bounds.height > 0 ? Math.max(480, bounds.height / scale) : 720;

  return (
    <div
      ref={hostRef}
      className="flex h-full min-h-0 w-full items-start justify-center overflow-hidden"
      data-preview-device={device}
    >
      <div
        className={
          "relative h-full overflow-hidden bg-white shadow-xl " +
          (device === "mobile"
            ? "rounded-[1.75rem] border-[6px] border-stone-900"
            : "rounded-xl border border-stone-300")
        }
        style={{ width: frameWidth || "100%" }}
      >
        <iframe
          ref={frameRef}
          src={"/activity-track-preview/" + encodeURIComponent(document.id)}
          title={
            device === "mobile"
              ? "Mobile student preview"
              : device === "tablet"
                ? "Tablet student preview"
                : "Desktop student preview"
          }
          onLoad={sendDocument}
          className="absolute left-0 top-0 border-0 bg-white"
          style={{
            width: viewportWidth,
            height: viewportHeight,
            transform: "scale(" + scale + ")",
            transformOrigin: "top left",
          }}
          allow="autoplay"
        />
      </div>
    </div>
  );
}
