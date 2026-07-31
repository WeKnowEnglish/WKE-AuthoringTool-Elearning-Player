"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Table2 } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { normalizeTemplateAnswer, scoreVerbTable, verbTableCellId, type VerbFormColumn, type VerbTableSection } from "@/lib/homework-templates/homework-template-one";

const STORAGE_KEY = "wke-pilot-homework-template-one:verb-table:v1";

export function VerbTableActivity({ section, onBack, onNext, onMasteryChange }: { section: VerbTableSection; onBack: () => void; onNext: () => void; onMasteryChange?: (mastered: boolean) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"); if (saved?.answers) setAnswers(saved.answers); if (typeof saved?.checked === "boolean") setChecked(saved.checked); if (typeof saved?.reviewing === "boolean") setReviewing(saved.reviewing); } catch { /* Ignore malformed pilot progress. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, checked, reviewing })); }, [answers, checked, hydrated, reviewing]);
  const result = useMemo(() => scoreVerbTable(section, answers), [answers, section]);
  const mastered = checked && result.correct === result.total;
  useEffect(() => { onMasteryChange?.(mastered); }, [mastered, onMasteryChange]);
  const completed = section.rows.flatMap((row) => row.missing.map((column) => answers[verbTableCellId(row.id, column)] ?? "")).filter((value) => value.trim()).length;
  const cellCorrect = (rowId: string, column: VerbFormColumn, expected: string) => expected.split("/").some((answer) => normalizeTemplateAnswer(answer) === normalizeTemplateAnswer(answers[verbTableCellId(rowId, column)] ?? ""));
  if (!hydrated) return <KidPanel className="bg-white">Opening Part 4…</KidPanel>;
  if (reviewing) return <KidPanel className="bg-white text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-14 w-14" /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-teal-700">Part 4 review</p><h2 className="mt-2 text-3xl font-black text-kid-ink">Verb table complete!</h2><p className="mt-3 text-lg font-bold text-kid-ink/70">You completed all {result.total} missing verb forms correctly.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><KidButton variant="secondary" onClick={onBack}>Back to Part 3</KidButton><KidButton onClick={() => { setReviewing(false); setChecked(false); }}>Practise again</KidButton><KidButton onClick={onNext}>Continue to Part 5</KidButton></div></KidPanel>;

  return <div className="space-y-4">
    <KidPanel className="bg-white"><div className="flex items-start gap-4"><div className="rounded-2xl bg-teal-100 p-3 text-teal-800"><Table2 className="h-8 w-8" /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Part 4 of 6 · Grammar</p><h2 className="mt-1 text-2xl font-black text-kid-ink">{section.title}</h2><p className="mt-1 font-semibold text-kid-ink/70">{section.instructions}</p></div></div><p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">Tip: regular verbs often end in <strong>-ed</strong>. Irregular verbs change in different ways.</p></KidPanel>
    <KidPanel className="overflow-hidden bg-white !p-0"><div className="overflow-x-auto"><table className="w-full min-w-[42rem] border-collapse"><thead><tr className="bg-[#17375e] text-left text-white"><th className="w-14 px-4 py-4 text-center text-xs font-black uppercase tracking-wide">#</th>{section.columns.map((column) => <th key={column.id} className="px-4 py-4 text-sm font-black">{column.label}</th>)}</tr></thead><tbody>{section.rows.map((row, rowIndex) => <tr key={row.id} className={rowIndex % 2 ? "bg-slate-50" : "bg-white"}><td className="border-t border-slate-200 px-4 py-4 text-center text-sm font-black text-slate-400">{rowIndex + 1}</td>{section.columns.map((column) => { const missing = row.missing.includes(column.id); const id = verbTableCellId(row.id, column.id); const correct = missing && cellCorrect(row.id, column.id, row.forms[column.id]); return <td key={column.id} className="border-t border-slate-200 px-4 py-3">{missing ? <div><input value={answers[id] ?? ""} disabled={checked && correct} onChange={(event) => { setAnswers((current) => ({ ...current, [id]: event.target.value })); setChecked(false); }} aria-label={`${row.id} ${column.label}`} placeholder="Type the missing form" className={`w-full rounded-xl border-2 px-3 py-2 text-base font-black text-[#17375e] focus:outline-none focus:ring-4 ${checked ? correct ? "border-emerald-500 bg-emerald-50 focus:ring-emerald-100" : "border-amber-500 bg-amber-50 focus:ring-amber-100" : "border-teal-300 bg-teal-50 focus:border-teal-600 focus:ring-teal-100"}`} />{checked && !correct ? <p className="mt-1 text-xs font-bold text-amber-900">Use the other forms as a clue.</p> : null}</div> : <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 text-base font-black text-slate-700">{row.forms[column.id]}</span>}</td>; })}</tr>)}</tbody></table></div></KidPanel>
    {checked ? <KidPanel className={`bg-white ${mastered ? "border-emerald-600" : "border-amber-500"}`}><p className="font-black text-kid-ink">{mastered ? "Every missing verb form is correct!" : `${result.correct} of ${result.total} missing forms correct. Use the completed cells as clues.`}</p></KidPanel> : null}
    <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white"><button type="button" onClick={onBack} className="text-sm font-black text-sky-800 underline underline-offset-4">Back to Part 3</button><div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-600">{completed} of {result.total} filled</span>{mastered ? <KidButton onClick={() => setReviewing(true)}>Review Part 4</KidButton> : <KidButton disabled={completed < result.total} onClick={() => setChecked(true)}>{checked ? "Check again" : "Check my table"}</KidButton>}</div></KidPanel>
  </div>;
}
