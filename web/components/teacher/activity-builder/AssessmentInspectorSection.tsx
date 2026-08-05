"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  /** When set, section is controlled by parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};

/** Collapsible block for assessment inspector (part setup, shared stimulus, etc.). */
export function AssessmentInspectorSection({
  title,
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setUncontrolledOpen(next);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-stone-100/80"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          {title}
        </span>
        <span className="text-[10px] text-stone-400" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-stone-200 px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}
