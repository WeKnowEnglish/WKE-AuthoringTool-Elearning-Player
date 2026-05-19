"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  ariaLabel: string;
  children: ReactNode;
};

/** Fixed-height side panel: header stays visible, body scrolls. */
export function StickerBookScrollCard({ title, ariaLabel, children }: Props) {
  return (
    <aside
      className="flex h-full min-h-0 w-full max-h-full flex-col overflow-hidden rounded-xl border-4 border-kid-ink bg-kid-panel/90 p-1.5 shadow-[2px_2px_0_#1a1a1a]"
      aria-label={ariaLabel}
    >
      <p className="shrink-0 px-0.5 pb-1.5 text-center text-[0.65rem] font-extrabold uppercase leading-tight tracking-wide text-kid-ink/80">
        {title}
      </p>
      <div className="min-h-0 flex-1 basis-0 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        {children}
      </div>
    </aside>
  );
}
