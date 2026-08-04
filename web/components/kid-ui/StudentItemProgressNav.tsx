"use client";

/**
 * Shared student question progress bubbles (picture cloze style).
 * Use for any one-item-at-a-time homework player that should tint
 * bubbles after Check: idle → answered → correct / incorrect.
 */

export type StudentItemProgressResult = "none" | "correct" | "incorrect";

export type StudentItemProgressItem = {
  id: string;
  /** Screen-reader label, e.g. "Picture 1". */
  label: string;
  /** Has a non-empty student response (pre-check). */
  filled?: boolean;
  /** Post-check outcome; keep "none" until answers are checked. */
  result?: StudentItemProgressResult;
};

export type StudentItemProgressNavProps = {
  items: readonly StudentItemProgressItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  ariaLabel?: string;
};

export function studentItemProgressBubbleClass(input: {
  current: boolean;
  filled: boolean;
  result: StudentItemProgressResult;
}): string {
  const { current, filled, result } = input;
  const base =
    "rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4";

  if (current) {
    if (result === "incorrect") {
      return `${base} h-2.5 w-8 bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.28)] focus-visible:ring-amber-200`;
    }
    if (result === "correct") {
      return `${base} h-2.5 w-8 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] focus-visible:ring-emerald-200`;
    }
    return `${base} h-2.5 w-8 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] focus-visible:ring-emerald-200`;
  }

  if (result === "incorrect") {
    return `${base} h-2.5 w-2.5 bg-amber-400 hover:scale-110 focus-visible:ring-amber-200`;
  }
  if (result === "correct") {
    return `${base} h-2.5 w-2.5 bg-emerald-500 hover:scale-110 focus-visible:ring-emerald-200`;
  }
  if (filled) {
    return `${base} h-2.5 w-2.5 bg-emerald-300 hover:scale-110 focus-visible:ring-emerald-200`;
  }
  return `${base} h-2.5 w-2.5 bg-slate-300 hover:scale-110 hover:bg-slate-400 focus-visible:ring-emerald-200`;
}

function resultSuffix(result: StudentItemProgressResult, filled: boolean): string {
  if (result === "correct") return ", correct";
  if (result === "incorrect") return ", incorrect";
  if (filled) return ", answered";
  return "";
}

export function StudentItemProgressNav({
  items,
  currentIndex,
  onSelect,
  ariaLabel = "Question progress",
}: StudentItemProgressNavProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const current = index === currentIndex;
        const filled = Boolean(item.filled);
        const result = item.result ?? "none";
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={current}
            aria-label={`${item.label}${resultSuffix(result, filled)}`}
            onClick={() => onSelect(index)}
            className={studentItemProgressBubbleClass({ current, filled, result })}
          />
        );
      })}
    </div>
  );
}
