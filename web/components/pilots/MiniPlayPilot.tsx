"use client";

import { useState } from "react";
import { MiniPlayPlayer } from "@/components/homework/MiniPlayPlayer";
import { MiniPlayViewer } from "@/components/homework/MiniPlayViewer";
import { MiniPlayPartEditor } from "@/components/teacher/activity-builder/MiniPlayPartEditor";
import { createMiniPlayContent, miniPlayResponseIssues } from "@/lib/homework-collections/mini-play";
import type { HomeworkCollectionMiniPlayPart } from "@/lib/homework-collections/types";

export function MiniPlayPilot() {
  const [part, setPart] = useState<HomeworkCollectionMiniPlayPart>({ schemaVersion: 1, id: "mini-play-preview", kind: "mini_play", title: "Write a mini play", instructions: "Plan, write, and read your play.", required: true, ...createMiniPlayContent() });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"student" | "teacher" | "review">("student");
  const issues = miniPlayResponseIssues(part, answers);
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <header><p className="text-sm font-bold text-violet-700">Activity preview</p><h1 className="mt-2 text-3xl font-extrabold text-stone-950">Mini Play Builder</h1><p className="mt-3 text-sm leading-6 text-stone-600">Try the student sections and teacher authoring below. This preview does not create an assignment or submit homework. Teachers assign it from Track Builder → Graded → Add activity → Mini play.</p></header>
    <nav aria-label="Preview mode" className="flex flex-wrap gap-2">{([ ["student", "Student preview"], ["teacher", "Teacher authoring"], ["review", "Review preview"] ] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold ${mode === value ? "border-violet-600 bg-violet-100 text-violet-950" : "border-stone-300 bg-white text-stone-800"}`}>{label}</button>)}</nav>
    {mode === "teacher" ? <MiniPlayPartEditor part={part} onChange={setPart} /> : mode === "review" ? <MiniPlayViewer part={part} answers={answers} /> : <MiniPlayPlayer part={part} answers={answers} onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))} />}
    {mode === "student" ? <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700">{issues.length ? `${issues.length} checks remaining before this play is ready.` : "Ready for teacher review."}</p> : null}
  </main>;
}
