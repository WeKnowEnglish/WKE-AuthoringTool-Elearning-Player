"use client";

import type { GrammarLayoutType } from "@/lib/grammar-builder/schema";
import { LAYOUT_TYPE_OPTIONS } from "@/lib/grammar-builder/editor/layout-type-scaffolds";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  open: boolean;
  currentLayoutType: GrammarLayoutType;
  nextLayoutType: GrammarLayoutType;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LayoutTypeChangeDialog({
  open,
  currentLayoutType,
  nextLayoutType,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) {
    return null;
  }

  const nextMeta = LAYOUT_TYPE_OPTIONS.find((option) => option.value === nextLayoutType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border-2 border-kid-ink bg-kid-panel p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="layout-type-dialog-title"
      >
        <h2 id="layout-type-dialog-title" className="text-lg font-extrabold text-kid-ink">
          Change layout type?
        </h2>
        <p className="mt-2 text-sm font-semibold text-kid-ink/70">
          {currentLayoutType} → {nextLayoutType}
        </p>
        {nextMeta ?
          <p className="mt-1 text-sm text-kid-ink/60">{nextMeta.description}</p>
        : null}
        <p className="mt-3 text-sm font-medium text-kid-ink/80">
          Keeps kid title, subtitle, theme, and glance rule. Replaces the card body with a layout
          template and removes interactions on this card.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton type="button" onClick={onConfirm}>
            Apply template
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </KidButton>
        </div>
      </div>
    </div>
  );
}
