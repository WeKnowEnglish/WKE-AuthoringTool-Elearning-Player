"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

type PagerTone = "stone" | "ltc";

export type AuthoringItemPagerProps = {
  count: number;
  index: number;
  onIndexChange: (next: number) => void;
  /** Singular unit label, e.g. "Question", "Line", "Row". */
  label?: string;
  /**
   * Optional short labels per item. When provided (same length as `count`),
   * shows scannable chips instead of bare dots.
   */
  itemLabels?: string[];
  minCount?: number;
  maxCount?: number;
  onAdd?: () => void;
  onRemove?: () => void;
  addDisabled?: boolean;
  removeDisabled?: boolean;
  tone?: PagerTone;
  /**
   * Pin the nav chrome while the item editor scrolls (requires a scroll
   * ancestor without overflow:hidden between this and the scroller).
   */
  stickyNav?: boolean;
  children: ReactNode;
};

function truncateChip(text: string, max = 14): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

const toneClasses: Record<
  PagerTone,
  {
    bar: string;
    stickyBar: string;
    button: string;
    label: string;
    danger: string;
    dot: string;
    dotActive: string;
    chip: string;
    chipActive: string;
  }
> = {
  stone: {
    bar: "border-stone-200 bg-stone-50",
    stickyBar: "border-stone-200 bg-stone-50/95 backdrop-blur-sm",
    button:
      "border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:opacity-35",
    label: "text-stone-700",
    danger:
      "border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-35",
    dot: "bg-stone-300 hover:bg-stone-500",
    dotActive: "bg-stone-900 ring-2 ring-stone-900/25 ring-offset-1 ring-offset-stone-50",
    chip:
      "border-stone-300 bg-white text-stone-700 hover:bg-stone-100",
    chipActive:
      "border-stone-900 bg-stone-900 text-white",
  },
  ltc: {
    bar: "border-[var(--ltc-border)] bg-[var(--ltc-elevated,white)]",
    stickyBar:
      "border-[var(--ltc-border)] bg-[color-mix(in_srgb,var(--ltc-elevated,white)_94%,transparent)] backdrop-blur-sm",
    button:
      "border-[var(--ltc-border)] bg-[var(--ltc-elevated,white)] text-[var(--ltc-fg)] hover:opacity-90 disabled:opacity-35",
    label: "ltc-muted",
    danger:
      "border-red-300 bg-[var(--ltc-elevated,white)] text-red-700 hover:opacity-90 disabled:opacity-35",
    dot: "bg-[var(--ltc-border)] hover:opacity-80",
    dotActive:
      "bg-[var(--ltc-fg)] ring-2 ring-[var(--ltc-fg)]/20 ring-offset-1 ring-offset-[var(--ltc-panel,white)]",
    chip:
      "border-[var(--ltc-border)] bg-[var(--ltc-elevated,white)] text-[var(--ltc-fg)] hover:opacity-90",
    chipActive:
      "border-[var(--ltc-fg)] bg-[var(--ltc-fg)] text-[var(--ltc-elevated,white)]",
  },
};

/**
 * One-item-at-a-time chrome for authoring packs. Does not reorder data —
 * only focuses an index in an existing list.
 */
export function AuthoringItemPager({
  count,
  index,
  onIndexChange,
  label = "Item",
  itemLabels,
  minCount = 1,
  maxCount,
  onAdd,
  onRemove,
  addDisabled,
  removeDisabled,
  tone = "stone",
  stickyNav = false,
  children,
}: AuthoringItemPagerProps) {
  const classes = toneClasses[tone];
  const safeCount = Math.max(0, count);
  const atMin = safeCount <= minCount;
  const atMax = typeof maxCount === "number" ? safeCount >= maxCount : false;
  const useChips =
    Array.isArray(itemLabels) && itemLabels.length === safeCount && safeCount > 0;
  const navBarClass = stickyNav ? classes.stickyBar : classes.bar;

  if (safeCount < 1) {
    return (
      <div className="space-y-2">
        <div
          className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${navBarClass}`}
        >
          <p className={`text-[11px] font-bold ${classes.label}`}>
            No {label.toLowerCase()}s yet
          </p>
          {onAdd ? (
            <button
              type="button"
              disabled={addDisabled || atMax}
              onClick={onAdd}
              aria-label={`Add ${label.toLowerCase()}`}
              title={`Add ${label.toLowerCase()}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${classes.button}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const frame =
    tone === "ltc"
      ? "rounded-lg border border-[var(--ltc-border)] p-2.5"
      : "rounded-xl border border-stone-200 bg-stone-50/80 p-2.5";

  return (
    <div className="space-y-2">
      <div
        className={`rounded-lg border px-2 py-1.5 ${navBarClass}${
          stickyNav ? " sticky top-0 z-10" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <p
            className={`shrink-0 text-[11px] font-extrabold tabular-nums ${classes.label}`}
          >
            {index + 1}
            <span className="font-semibold opacity-60">/{safeCount}</span>
          </p>
          <div
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
            role="tablist"
            aria-label={`${label} list`}
          >
            {Array.from({ length: safeCount }, (_, itemIndex) => {
              const active = itemIndex === index;
              const chipText = useChips
                ? truncateChip(itemLabels![itemIndex] ?? "")
                : "";
              if (useChips) {
                return (
                  <button
                    key={itemIndex}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`${label} ${itemIndex + 1} of ${safeCount}${
                      chipText ? `: ${itemLabels![itemIndex]}` : ""
                    }`}
                    title={itemLabels![itemIndex] || `${label} ${itemIndex + 1}`}
                    onClick={() => onIndexChange(itemIndex)}
                    className={`max-w-[7.5rem] truncate rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition ${
                      active ? classes.chipActive : classes.chip
                    }`}
                  >
                    <span className="opacity-70">{itemIndex + 1}</span>
                    {chipText ? (
                      <>
                        <span className="opacity-50"> · </span>
                        {chipText}
                      </>
                    ) : null}
                  </button>
                );
              }
              return (
                <button
                  key={itemIndex}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${label} ${itemIndex + 1} of ${safeCount}`}
                  title={`${label} ${itemIndex + 1}`}
                  onClick={() => onIndexChange(itemIndex)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    active ? classes.dotActive : classes.dot
                  }`}
                />
              );
            })}
          </div>
          {onAdd || onRemove ? (
            <div className="flex shrink-0 items-center gap-1">
              {onRemove ? (
                <button
                  type="button"
                  disabled={removeDisabled || atMin}
                  aria-label={`Remove ${label.toLowerCase()}`}
                  title={`Remove ${label.toLowerCase()}`}
                  onClick={onRemove}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${classes.danger}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {onAdd ? (
                <button
                  type="button"
                  disabled={addDisabled || atMax}
                  aria-label={`Add ${label.toLowerCase()}`}
                  title={`Add ${label.toLowerCase()}`}
                  onClick={onAdd}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${classes.button}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className={frame}>{children}</div>
    </div>
  );
}

/** Clamps focused index when the pack shrinks or the reset key changes. */
export function useAuthoringItemIndex(count: number, resetKey?: string) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [resetKey]);

  useEffect(() => {
    if (count < 1) {
      setIndex(0);
      return;
    }
    setIndex((current) => Math.min(current, count - 1));
  }, [count]);

  return [index, setIndex] as const;
}
