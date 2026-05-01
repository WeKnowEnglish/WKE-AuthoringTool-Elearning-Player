"use client";

import type { StoryItem } from "@/lib/lesson-schemas";
import { ScaledStoryItemImage } from "@/components/story/ScaledStoryItemImage";

/** Inner visual for a story canvas item (student + teacher preview). Parent supplies card chrome. */
export function StoryItemLayerContent({ item }: { item: StoryItem }) {
  const kind = item.kind ?? "image";

  if (kind === "text") {
    return (
      <span
        className="flex h-full w-full items-center justify-center px-2 text-center font-semibold whitespace-pre-wrap break-words"
        style={{
          color: item.text_color ?? "#0f172a",
          fontSize: `calc(${item.text_size_px ?? 24} * 100cqw / 960)`,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          lineHeight: 1.2,
        }}
      >
        {item.text?.trim() || "Text"}
      </span>
    );
  }

  if (kind === "shape") {
    const fill = item.color_hex?.trim() || "#3b82f6";
    return (
      <span className="block h-full w-full rounded-lg" style={{ backgroundColor: fill }} aria-hidden />
    );
  }

  if (kind === "line") {
    const stroke = item.color_hex?.trim() || "#0f172a";
    const sw = Math.min(24, Math.max(1, item.line_width_px ?? 3));
    return (
      <svg
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "button") {
    const bg = item.color_hex?.trim() || "#0ea5e9";
    return (
      <span
        className="flex h-full w-full items-center justify-center rounded-lg px-2 text-center text-sm font-bold shadow-inner"
        style={{
          backgroundColor: bg,
          color: item.text_color ?? "#ffffff",
          fontSize: `calc(${item.text_size_px ?? 18} * 100cqw / 960)`,
        }}
      >
        {item.text?.trim() || "Button"}
      </span>
    );
  }

  const src = item.image_url;
  if (!src) return null;
  return (
    <ScaledStoryItemImage imageUrl={src} imageScale={item.image_scale ?? 1} />
  );
}
