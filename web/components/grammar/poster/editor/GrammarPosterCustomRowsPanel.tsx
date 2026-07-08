"use client";

import type { GrammarModule } from "@/lib/grammar-builder/schema";
import {
  addCustomRow,
  moveCustomRow,
  removeCustomRow,
  setCustomRowCard,
  updateCustomRowColumns,
} from "@/lib/grammar-builder/editor/custom-rows-mutations";
import { EditorFieldLabel } from "./fields/EditorFields";

type Props = {
  draft: GrammarModule;
  onChange: (module: GrammarModule) => void;
};

export function GrammarPosterCustomRowsPanel({ draft, onChange }: Props) {
  if (draft.pageLayout !== "custom") {
    return null;
  }

  const rows = draft.customRows ?? [];
  const assigned = new Set(rows.flatMap((row) => row.cardIds));

  return (
    <section className="space-y-3 rounded-xl border border-dashed border-kid-ink/20 bg-white/50 p-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Custom rows
      </h3>

      {rows.length === 0 ?
        <p className="text-sm font-semibold text-amber-800">Add at least one row.</p>
      : null}

      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-lg border border-kid-ink/15 bg-white p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase text-kid-ink/60">
                Row {rowIndex + 1}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  disabled={rowIndex === 0}
                  onClick={() => onChange(moveCustomRow(draft, rowIndex, "up"))}
                  className="rounded border border-kid-ink/20 px-1.5 text-xs font-bold disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={rowIndex === rows.length - 1}
                  onClick={() => onChange(moveCustomRow(draft, rowIndex, "down"))}
                  className="rounded border border-kid-ink/20 px-1.5 text-xs font-bold disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(removeCustomRow(draft, rowIndex))}
                  className="rounded border border-kid-ink/20 px-1.5 text-xs font-bold text-red-700"
                >
                  ×
                </button>
              </span>
            </div>

            <div className="mt-2">
              <EditorFieldLabel>Columns</EditorFieldLabel>
              <select
                value={row.columns}
                onChange={(event) =>
                  onChange(
                    updateCustomRowColumns(
                      draft,
                      rowIndex,
                      Number(event.target.value) as 1 | 2,
                    ),
                  )
                }
                className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1 text-sm font-semibold"
              >
                <option value={1}>1 (full width)</option>
                <option value={2}>2 (side by side)</option>
              </select>
            </div>

            <div className="mt-2 space-y-2">
              {Array.from({ length: row.columns }, (_, slotIndex) => (
                <div key={slotIndex}>
                  <EditorFieldLabel>Card {slotIndex + 1}</EditorFieldLabel>
                  <select
                    value={row.cardIds[slotIndex] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      onChange(
                        setCustomRowCard(
                          draft,
                          rowIndex,
                          slotIndex,
                          value ? Number(value) : null,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1 text-sm font-semibold"
                  >
                    <option value="">(empty)</option>
                    {draft.cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.id}. {card.kidTitle ?? card.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange(addCustomRow(draft, 2))}
        className="w-full rounded-lg border-2 border-dashed border-kid-ink/25 px-3 py-2 text-sm font-bold text-kid-ink/70 hover:bg-white"
      >
        + Add row
      </button>

      {draft.cards.some((card) => !assigned.has(card.id)) ?
        <p className="text-xs font-semibold text-amber-800">
          Unassigned cards:{" "}
          {draft.cards
            .filter((card) => !assigned.has(card.id))
            .map((card) => card.id)
            .join(", ")}
        </p>
      : null}
    </section>
  );
}
