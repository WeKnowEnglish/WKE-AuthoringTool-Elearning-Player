"use client";

import { useMemo, useState } from "react";
import { Check, Table2 } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  isVerbTableCellCorrect,
  scoreVerbTablePlayable,
  verbTableCellId,
  type VerbFormColumn,
  type VerbTablePlayable,
} from "@/lib/verb-table";

type Stage = "activity" | "review";

type Props = {
  activity: VerbTablePlayable;
  eyebrow?: string;
  onMastered?: () => void;
  showTip?: boolean;
};

export function VerbTablePlayer({
  activity,
  eyebrow = "Verb table",
  onMastered,
  showTip = true,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<Stage>("activity");

  const result = useMemo(
    () => scoreVerbTablePlayable(activity, answers),
    [activity, answers],
  );
  const completed = activity.rows
    .flatMap((row) =>
      row.missing.map((column) => answers[verbTableCellId(row.id, column)] ?? ""),
    )
    .filter((value) => value.trim()).length;
  const mastered = checked && result.correct === result.total;

  const cellCorrect = (rowId: string, column: VerbFormColumn, expected: string) =>
    isVerbTableCellCorrect(answers[verbTableCellId(rowId, column)] ?? "", expected);

  if (stage === "review") {
    return (
      <KidPanel className="bg-white text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-14 w-14" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-teal-700">
          Review
        </p>
        <h2 className="mt-2 text-3xl font-black text-kid-ink">Verb table complete!</h2>
        <p className="mt-3 text-lg font-bold text-kid-ink/70">
          You completed all {result.total} missing verb forms correctly.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <KidButton
            variant="secondary"
            onClick={() => {
              setStage("activity");
              setChecked(false);
            }}
          >
            Practise again
          </KidButton>
          {onMastered ? <KidButton onClick={onMastered}>Done</KidButton> : null}
        </div>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="bg-white">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-teal-100 p-3 text-teal-800">
            <Table2 className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black text-kid-ink">{activity.title}</h2>
            <p className="mt-1 font-semibold text-kid-ink/70">{activity.instructions}</p>
          </div>
        </div>
        {showTip ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
            Tip: regular verbs often end in <strong>-ed</strong>. Irregular verbs change in
            different ways.
          </p>
        ) : null}
      </KidPanel>

      <KidPanel className="overflow-hidden bg-white !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr className="bg-[#17375e] text-left text-white">
                <th className="w-14 px-4 py-4 text-center text-xs font-black uppercase tracking-wide">
                  #
                </th>
                {activity.columns.map((column) => (
                  <th key={column.id} className="px-4 py-4 text-sm font-black">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={rowIndex % 2 ? "bg-slate-50" : "bg-white"}
                >
                  <td className="border-t border-slate-200 px-4 py-4 text-center text-sm font-black text-slate-400">
                    {rowIndex + 1}
                  </td>
                  {activity.columns.map((column) => {
                    const missing = row.missing.includes(column.id);
                    const id = verbTableCellId(row.id, column.id);
                    const correct =
                      missing && cellCorrect(row.id, column.id, row.forms[column.id]);
                    return (
                      <td key={column.id} className="border-t border-slate-200 px-4 py-3">
                        {missing ? (
                          <div>
                            <input
                              value={answers[id] ?? ""}
                              disabled={checked && correct}
                              onChange={(event) => {
                                setAnswers((current) => ({
                                  ...current,
                                  [id]: event.target.value,
                                }));
                                setChecked(false);
                              }}
                              aria-label={`${row.id} ${column.label}`}
                              placeholder="Type the missing form"
                              className={`w-full rounded-xl border-2 px-3 py-2 text-base font-black text-[#17375e] focus:outline-none focus:ring-4 ${
                                checked
                                  ? correct
                                    ? "border-emerald-500 bg-emerald-50 focus:ring-emerald-100"
                                    : "border-amber-500 bg-amber-50 focus:ring-amber-100"
                                  : "border-teal-300 bg-teal-50 focus:border-teal-600 focus:ring-teal-100"
                              }`}
                            />
                            {checked && !correct ? (
                              <p className="mt-1 text-xs font-bold text-amber-900">
                                Use the other forms as a clue.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 text-base font-black text-slate-700">
                            {row.forms[column.id]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </KidPanel>

      {checked ? (
        <KidPanel
          className={`bg-white ${mastered ? "border-emerald-600" : "border-amber-500"}`}
        >
          <p className="font-black text-kid-ink">
            {mastered
              ? "Every missing verb form is correct!"
              : `${result.correct} of ${result.total} missing forms correct. Use the completed cells as clues.`}
          </p>
        </KidPanel>
      ) : null}

      <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <span className="text-sm font-bold text-slate-600">
          {completed} of {result.total} filled
        </span>
        {mastered ? (
          <KidButton onClick={() => setStage("review")}>Review</KidButton>
        ) : (
          <KidButton
            disabled={completed < result.total}
            onClick={() => setChecked(true)}
          >
            {checked ? "Check again" : "Check my table"}
          </KidButton>
        )}
      </KidPanel>
    </div>
  );
}
