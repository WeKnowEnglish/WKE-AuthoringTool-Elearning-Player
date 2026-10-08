"use client";

import type { HomeworkCollectionMiniPlayPart } from "@/lib/homework-collections/types";
const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900";

export function MiniPlayPartEditor({ part, onChange }: { part: HomeworkCollectionMiniPlayPart; onChange: (part: HomeworkCollectionMiniPlayPart) => void }) {
  return <div className="space-y-5">
    <p className="rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-950">Students describe characters and a setting, then choose their character names for each script line. Their complete play is saved for teacher review.</p>
    {([ ["prompt", "Play-writing task"], ["charactersPrompt", "Characters section guidance"], ["settingPrompt", "Setting section guidance"], ["scriptPrompt", "Script section guidance"] ] as const).map(([key, label]) => <label key={key} className="block text-sm font-bold text-stone-800">{label}<textarea rows={3} maxLength={2000} value={part[key]} onChange={(event) => onChange({ ...part, [key]: event.target.value })} className={field} /></label>)}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{([ ["minCharacters", "Minimum characters", 2, 6], ["maxCharacters", "Maximum characters", 2, 6], ["minDialogueLines", "Minimum spoken lines", 2, 24], ["maxPoints", "Teacher review points", 1, 100] ] as const).map(([key, label, min, max]) => <label key={key} className="text-sm font-bold text-stone-800">{label}<input type="number" min={min} max={max} value={part[key]} onChange={(event) => onChange({ ...part, [key]: Number(event.target.value) })} className={field} /></label>)}</div>
    {([ ["wordBank", "Useful words (one per line, optional)"], ["sentenceStarters", "Sentence starters (one per line, optional)"], ["successCriteria", "Success criteria (one per line)"] ] as const).map(([key, label]) => <label key={key} className="block text-sm font-bold text-stone-800">{label}<textarea rows={4} value={part[key].join("\n")} onChange={(event) => onChange({ ...part, [key]: event.target.value.split("\n") })} onBlur={() => onChange({ ...part, [key]: part[key].map((entry) => entry.trim()).filter(Boolean) })} className={field} /><span className="mt-1 block text-xs font-normal text-stone-500">Up to 20 entries; 200 characters each.</span></label>)}
  </div>;
}
