"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import type { StickerDef } from "@/lib/progress/sticker-library";

type Props = {
  stickers: StickerDef[];
  selectedStickerId: string | null;
  onSelectSticker: (def: StickerDef) => void;
  layout?: "horizontal" | "vertical";
  emptyMessage?: ReactNode;
};

export function StickerTray({
  stickers,
  selectedStickerId,
  onSelectSticker,
  layout = "horizontal",
  emptyMessage,
}: Props) {
  const vertical = layout === "vertical";

  if (stickers.length === 0) {
    return (
      <p
        className={clsx(
          "font-semibold text-kid-ink/75",
          vertical ?
            "px-1 py-2 text-center text-[0.65rem] leading-snug"
          : "rounded-xl border-2 border-dashed border-kid-ink/40 bg-kid-panel/80 px-3 py-4 text-center text-sm",
        )}
      >
        {emptyMessage ?? "No stickers yet."}
      </p>
    );
  }

  return (
    <ul
      className={clsx(
        vertical ?
          "flex flex-col gap-1.5 pb-1"
        : "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {stickers.map((s) => {
        const selected = selectedStickerId === s.id;
        return (
          <li key={s.id} className={vertical ? "" : "shrink-0"}>
            <button
              type="button"
              title={s.label}
              aria-pressed={selected}
              className={clsx(
                "flex items-center justify-center rounded-xl border-4 border-kid-ink transition-transform [touch-action:manipulation] active:scale-95",
                vertical ? "h-12 w-full text-2xl" : "h-14 w-14 text-3xl",
                selected ? "bg-[#0f4ecf] shadow-[2px_2px_0_#0a2f86]" : "bg-white hover:bg-kid-surface-muted",
              )}
              onClick={() => onSelectSticker(s)}
            >
              <span aria-hidden>{s.emoji}</span>
              <span className="sr-only">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
