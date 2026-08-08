"use client";

import { pickerPool, type StudentPickerState } from "@/lib/classroom-tools/picker";

type Props = {
  picker: StudentPickerState;
  draft: string;
  onDraftChange: (draft: string) => void;
  onApplyBank: () => void;
  onDraw: () => void;
  onResetCycle: () => void;
};

export function NamePickerToolPanel({
  picker,
  draft,
  onDraftChange,
  onApplyBank,
  onDraw,
  onResetCycle,
}: Props) {
  const remaining = pickerPool(picker);
  const current = picker.currentStudentIds;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">Name picker</h2>
        <p className="text-[11px] text-stone-500">
          One label per line · cycle {picker.cycleNumber} · {remaining.length} left
        </p>
      </div>

      {current.length > 0 ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800">
            Drawn
          </p>
          <p className="mt-1 text-2xl font-extrabold text-teal-950">
            {current.join(" · ")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">
          Draw to pick a name
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={picker.availableStudentIds.length === 0}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          onClick={onDraw}
        >
          Draw one
        </button>
        <button
          type="button"
          className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-bold"
          onClick={onResetCycle}
        >
          Reset cycle
        </button>
      </div>

      <label className="block text-[11px] font-semibold text-stone-700">
        Bank
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={5}
          placeholder={"Alex\nBai\nChi"}
          className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2.5 py-2 font-normal text-sm text-stone-900"
        />
      </label>
      <button
        type="button"
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-800"
        onClick={onApplyBank}
      >
        Apply bank
      </button>

      {picker.pickedStudentIds.length > 0 ? (
        <p className="text-[11px] text-stone-500">
          Already drawn this cycle: {picker.pickedStudentIds.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
