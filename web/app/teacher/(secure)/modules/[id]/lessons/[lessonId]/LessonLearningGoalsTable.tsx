"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveLessonLearningGoals } from "@/lib/actions/teacher";

type Props = {
  lessonId: string;
  moduleId: string;
  initialGoals: string[];
  compact?: boolean;
};

export function LessonLearningGoalsTable({ lessonId, moduleId, initialGoals, compact }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<string[]>(() =>
    initialGoals.length > 0 ? [...initialGoals] : [""],
  );
  const [savedHint, setSavedHint] = useState("");

  function addRow() {
    setRows((r) => [...r, ""]);
  }

  function removeRow(index: number) {
    setRows((r) => (r.length <= 1 ? [""] : r.filter((_, i) => i !== index)));
  }

  function updateRow(index: number, value: string) {
    setRows((r) => r.map((line, i) => (i === index ? value : line)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavedHint("");
    const fd = new FormData(e.currentTarget);
    await saveLessonLearningGoals(lessonId, moduleId, fd);
    setSavedHint("Saved.");
    router.refresh();
  }

  return (
    <section
      className={`rounded-lg border border-amber-200/80 bg-amber-50/90 shadow-sm ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`font-bold text-amber-950 ${compact ? "text-sm" : "text-base"}`}>
          Learning objectives
        </h2>
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-amber-700 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          Add new objective
        </button>
      </div>
      <p className={`mt-1 text-amber-900 ${compact ? "text-xs" : "text-sm"}`}>
        Edit objectives in the table, then save. These are used by the AI generator and stored on the
        lesson.
      </p>
      <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
        <input type="hidden" name="learning_goals_json" value={JSON.stringify(rows)} readOnly />
        <div className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto rounded border border-amber-200/60 bg-white/80 p-2">
          {rows.map((line, index) => (
            <div key={index} className="flex gap-2">
              <span className="w-6 shrink-0 pt-2 text-center text-xs font-medium text-amber-800">
                {index + 1}
              </span>
              <textarea
                value={line}
                onChange={(e) => updateRow(index, e.target.value)}
                rows={compact ? 2 : 2}
                className="min-h-[2.5rem] min-w-0 flex-1 rounded border border-amber-200 px-2 py-1 text-sm"
                placeholder="e.g. Students can name three zoo animals."
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="shrink-0 self-start rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                title="Remove row"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full rounded bg-amber-800 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-900"
        >
          Save objectives
        </button>
        {savedHint ? (
          <p className="text-xs font-medium text-emerald-800" role="status">
            {savedHint}
          </p>
        ) : null}
      </form>
    </section>
  );
}
