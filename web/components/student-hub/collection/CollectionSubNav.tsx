"use client";

import { clsx } from "clsx";
import { playSfx } from "@/lib/audio/sfx";
import { COLLECTION_PAGES, type CollectionPageId } from "./types";

type Props = {
  page: CollectionPageId;
  muted: boolean;
  onPageChange: (page: CollectionPageId) => void;
};

export function CollectionSubNav({ page, muted, onPageChange }: Props) {
  return (
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Collection sections"
    >
      {COLLECTION_PAGES.map((tab) => {
        const active = tab.id === page;
        return (
          <button
            key={tab.id}
            type="button"
            className={clsx(
              "shrink-0 rounded-full border-4 border-kid-ink px-3 py-1.5 text-sm font-extrabold transition-transform [touch-action:manipulation] active:scale-[0.98]",
              active ?
                "bg-[#0f4ecf] text-white shadow-[2px_2px_0_#0a2f86]"
              : "bg-kid-panel text-kid-ink hover:bg-kid-surface-muted",
            )}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (active) return;
              playSfx("tap", muted);
              onPageChange(tab.id);
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
