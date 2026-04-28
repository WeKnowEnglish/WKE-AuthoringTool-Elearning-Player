"use client";

import { clsx } from "clsx";

const STICKER_EMOJI = "⭐";

type Props = {
  count: number;
  maxVisible?: number;
  className?: string;
};

export function KidStickerStrip({ count, maxVisible = 8, className }: Props) {
  const show = Math.min(Math.max(0, count), maxVisible);
  if (show === 0) {
    return (
      <div
        className={clsx(
          "rounded-lg border-2 border-dashed border-kid-ink/40 px-2 py-1 text-sm font-semibold text-kid-ink/70",
          className,
        )}
        title="Earn a sticker every 3 correct answers"
      >
        Stickers: 0
      </div>
    );
  }
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-0.5 rounded-lg border-2 border-kid-ink bg-kid-panel px-2 py-1",
        className,
      )}
      title={`${count} sticker${count === 1 ? "" : "s"} earned`}
    >
      <span className="sr-only">{count} stickers earned</span>
      {Array.from({ length: show }).map((_, i) => (
        <span key={i} className="text-lg leading-none" aria-hidden>
          {STICKER_EMOJI}
        </span>
      ))}
      {count > maxVisible ? (
        <span className="text-xs font-bold text-kid-ink">+{count - maxVisible}</span>
      ) : null}
    </div>
  );
}
