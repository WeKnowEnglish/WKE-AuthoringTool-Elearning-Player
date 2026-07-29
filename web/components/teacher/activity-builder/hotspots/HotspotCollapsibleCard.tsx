"use client";

import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  /** Default sky; use amber for interaction-focused cards. */
  tone?: "sky" | "amber" | "stone";
  /** Optional controls shown in the header (e.g. Delete). Clicks do not toggle. */
  headerEnd?: ReactNode;
  children: ReactNode;
};

const TITLE_TONE: Record<NonNullable<Props["tone"]>, string> = {
  sky: "text-sky-800",
  amber: "text-amber-800",
  stone: "text-stone-500",
};

/**
 * Accordion settings card for Explore Hotspots side panels.
 * Opening one card closes others that share the same `openId` state.
 */
export function HotspotCollapsibleCard({
  id,
  title,
  openId,
  onOpenChange,
  tone = "sky",
  headerEnd,
  children,
}: Props) {
  const open = openId === id;

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/80">
      <div className="flex items-center gap-1 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left"
          aria-expanded={open}
          title={open ? "Collapse" : "Expand"}
          onClick={() => onOpenChange(open ? null : id)}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide ${TITLE_TONE[tone]}`}
          >
            {title}
          </span>
          <span className="shrink-0 text-[10px] text-stone-400" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>
        {headerEnd ? (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {headerEnd}
          </div>
        ) : null}
      </div>
      {open ? (
        <div className="border-t border-stone-200 px-3 pb-3 pt-1">{children}</div>
      ) : null}
    </section>
  );
}
