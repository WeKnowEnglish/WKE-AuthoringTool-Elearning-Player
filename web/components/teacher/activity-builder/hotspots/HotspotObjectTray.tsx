"use client";

import { useEffect, useRef, useState } from "react";
import type { HotspotElement } from "@/lib/hotspots/types";
import {
  sortHotspotsFrontToBack,
  type LayerReorderDirection,
} from "@/lib/hotspots/layers";
import { isShapeHotspot, isSpriteHotspot, isTextHotspot } from "@/lib/hotspots/sprites";

type Props = {
  hotspots: HotspotElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorderZ?: (id: string, direction: LayerReorderDirection) => void;
};

function layerType(hotspot: HotspotElement): string {
  if (isSpriteHotspot(hotspot)) return "sprite";
  if (isTextHotspot(hotspot)) return "text";
  if (isShapeHotspot(hotspot)) return "shape";
  return "hotspot";
}

function cardLabel(hotspot: HotspotElement) {
  return hotspot.name?.trim() || hotspot.labelText?.trim() || hotspot.id;
}

export function HotspotObjectTray({
  hotspots,
  selectedId,
  onSelect,
  onReorderZ,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const ordered = sortHotspotsFrontToBack(hotspots);

  const updateOverflow = () => {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollMore(false);
      return;
    }
    setCanScrollMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    updateOverflow();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateOverflow();
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;
      event.preventDefault();
      el.scrollLeft += delta;
      updateOverflow();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const observer = new ResizeObserver(() => updateOverflow());
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      observer.disconnect();
    };
  }, [ordered.length, selectedId]);

  const scrollMore = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.7));
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  if (hotspots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 px-3 py-2 text-xs text-stone-500">
        No objects yet — draw on the image or add a PNG.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] text-stone-400">
          Layers · left = front, right = back
        </p>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {ordered.map((hotspot, index) => {
          const selected = selectedId === hotspot.id;
          const canForward = index > 0;
          const canBackward = index < ordered.length - 1;
          return (
            <div
              key={hotspot.id}
              className={`w-[10.5rem] shrink-0 rounded-lg border ${
                selected
                  ? "border-sky-400 bg-sky-50"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(hotspot.id)}
                className="w-full px-2.5 py-1.5 text-left hover:bg-white/60"
              >
                <span className="block truncate text-xs font-semibold text-stone-900">
                  {cardLabel(hotspot)}
                </span>
                <span className="mt-0.5 inline-flex rounded bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600">
                  {layerType(hotspot)}
                </span>
              </button>
              {onReorderZ ? (
                <div className="flex border-t border-stone-200/80">
                  <button
                    type="button"
                    title="Bring forward"
                    aria-label={`Bring ${cardLabel(hotspot)} forward`}
                    disabled={!canForward}
                    className="flex-1 px-1 py-1 text-[10px] font-medium text-stone-600 hover:bg-white disabled:opacity-30"
                    onClick={() => onReorderZ(hotspot.id, "forward")}
                  >
                    ← Front
                  </button>
                  <button
                    type="button"
                    title="Send back"
                    aria-label={`Send ${cardLabel(hotspot)} back`}
                    disabled={!canBackward}
                    className="flex-1 border-l border-stone-200/80 px-1 py-1 text-[10px] font-medium text-stone-600 hover:bg-white disabled:opacity-30"
                    onClick={() => onReorderZ(hotspot.id, "backward")}
                  >
                    Back →
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {canScrollMore ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pl-8 bg-gradient-to-l from-white via-white/90 to-transparent">
          <button
            type="button"
            aria-label="Show more layers"
            className="pointer-events-auto mr-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-sky-300 hover:text-sky-800"
            onClick={scrollMore}
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="h-4 w-4 fill-none stroke-current"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7.5 4.5 13 10l-5.5 5.5" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
