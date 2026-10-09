"use client";

import { useState } from "react";
import type { HomeworkCollectionMiniPlayPart } from "@/lib/homework-collections/types";
import {
  MINI_PLAY_LINE_LENGTH, MINI_PLAY_MAX_LINES, miniPlayResponseIssues, readMiniPlayResponse,
  type MiniPlayCharacter, type MiniPlayLine,
} from "@/lib/homework-collections/mini-play";
import { MiniPlayViewer } from "./MiniPlayViewer";

const field = "mt-2 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-violet-600";
const button = "min-h-11 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-800 disabled:cursor-not-allowed disabled:opacity-40";
const steps = ["Characters", "Setting", "Script", "Read my play"];

export function MiniPlayPlayer({ part, answers, onAnswer, readOnly = false }: {
  part: HomeworkCollectionMiniPlayPart;
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  readOnly?: boolean;
}) {
  const [step, setStep] = useState(0);
  if (readOnly) return <MiniPlayViewer part={part} answers={answers} />;
  const play = readMiniPlayResponse(answers);
  const characters = answers.characters === undefined
    ? Array.from({ length: part.minCharacters }, (_, index) => ({ id: `character-${index + 1}`, name: "", description: "" }))
    : play.characters;
  const lines = play.lines;
  const issues = miniPlayResponseIssues(part, answers);
  const patchCharacters = (next: MiniPlayCharacter[]) => onAnswer("characters", JSON.stringify(next));
  const patchLines = (next: MiniPlayLine[]) => onAnswer("script", JSON.stringify(next));
  const patchLine = (id: string, patch: Partial<MiniPlayLine>) => patchLines(lines.map((line) => line.id === id ? { ...line, ...patch } : line));
  const addLine = (kind: MiniPlayLine["kind"]) => patchLines([...lines, { id: crypto.randomUUID(), kind, characterId: kind === "dialogue" ? characters.find((character) => character.name.trim())?.id ?? "" : "", text: "" }]);
  const moveLine = (index: number, direction: number) => {
    const next = [...lines];
    [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
    patchLines(next);
  };
  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-amber-50 p-4 text-base font-semibold leading-7 text-stone-900">{part.prompt}</p>
      <nav aria-label="Play sections" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{steps.map((label, index) => <button type="button" key={label} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)} className={`${button} ${step === index ? "border-violet-600 bg-violet-100 text-violet-950" : ""}`}>{index + 1}. {label}</button>)}</nav>
      {step === 0 ? <section className="space-y-4" aria-label="Create characters">
        <label className="block font-bold text-stone-900">Play title<input value={play.title} maxLength={120} onChange={(event) => onAnswer("play-title", event.target.value)} placeholder="Give your play a title" className={field} /></label>
        <h3 className="text-xl font-extrabold text-stone-950">Who is in your play?</h3><p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{part.charactersPrompt}</p>
        <p className="text-sm font-semibold text-violet-800">Create {part.minCharacters}–{part.maxCharacters} characters. You can reuse these names in your script.</p>
        {characters.map((character, index) => {
          const used = lines.some((line) => line.kind === "dialogue" && line.characterId === character.id);
          return <fieldset key={character.id} className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50 p-4"><legend className="px-1 font-extrabold text-violet-950">Character {index + 1}</legend>
            <label className="block text-sm font-bold text-stone-800">Character {index + 1} name<input value={character.name} maxLength={40} onChange={(event) => patchCharacters(characters.map((entry) => entry.id === character.id ? { ...entry, name: event.target.value } : entry))} className={field} placeholder="For example, Mia" /></label>
            <label className="block text-sm font-bold text-stone-800">Describe character {index + 1}<textarea value={character.description} maxLength={400} rows={3} onChange={(event) => patchCharacters(characters.map((entry) => entry.id === character.id ? { ...entry, description: event.target.value } : entry))} className={field} placeholder="Who are they? How do they feel? What do they want?" /></label>
            <button type="button" disabled={used || characters.length <= part.minCharacters} onClick={() => patchCharacters(characters.filter((entry) => entry.id !== character.id))} className={button} aria-label={`Remove character ${index + 1}`}>Remove character</button>
            {used ? <p className="text-xs leading-5 text-stone-600">This character speaks in your script. Change their lines to another speaker before removing them. Renaming them updates every line.</p> : null}
          </fieldset>;
        })}
        <button type="button" className={button} disabled={characters.length >= part.maxCharacters} onClick={() => patchCharacters([...characters, { id: crypto.randomUUID(), name: "", description: "" }])}>Add character</button>
      </section> : null}
      {step === 1 ? <section className="space-y-4" aria-label="Describe setting"><h3 className="text-xl font-extrabold text-stone-950">Where does your play happen?</h3><p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{part.settingPrompt}</p>
        <label className="block text-sm font-bold text-stone-800">Place<input value={play.setting.place} maxLength={120} onChange={(event) => onAnswer("setting", JSON.stringify({ ...play.setting, place: event.target.value }))} className={field} placeholder="For example, in the school playground" /></label>
        <label className="block text-sm font-bold text-stone-800">Time (optional)<input value={play.setting.time} maxLength={120} onChange={(event) => onAnswer("setting", JSON.stringify({ ...play.setting, time: event.target.value }))} className={field} placeholder="For example, after lunch" /></label>
        <label className="block text-sm font-bold text-stone-800">Describe the setting<textarea value={play.setting.description} maxLength={500} rows={4} onChange={(event) => onAnswer("setting", JSON.stringify({ ...play.setting, description: event.target.value }))} className={field} placeholder="What can the audience see? What is happening?" /></label>
      </section> : null}
      {step === 2 ? <section className="space-y-4" aria-label="Write script"><h3 className="text-xl font-extrabold text-stone-950">What do your characters say?</h3><p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{part.scriptPrompt}</p>
        <p className="text-sm font-bold text-violet-800">{lines.filter((line) => line.kind === "dialogue" && line.text.trim()).length} / {part.minDialogueLines} spoken lines · Up to {MINI_PLAY_MAX_LINES} total lines</p>
        {!characters.some((character) => character.name.trim()) ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Name your characters in section 1 so you can choose who speaks.</p> : null}
        {part.wordBank.length ? <aside className="rounded-xl bg-teal-50 p-3"><h4 className="text-sm font-bold text-teal-950">Useful words</h4><p className="mt-1 text-sm leading-6 text-teal-900">{part.wordBank.join(" · ")}</p></aside> : null}
        {lines.map((line, index) => <fieldset key={line.id} className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4"><legend className="px-1 text-sm font-extrabold text-stone-800">Line {index + 1} · {line.kind === "dialogue" ? "Spoken line" : "Stage direction"}</legend>
          {line.kind === "dialogue" ? <label className="block text-sm font-bold text-stone-800">Speaker for line {index + 1}<select value={line.characterId} onChange={(event) => patchLine(line.id, { characterId: event.target.value })} className={field}><option value="">Choose a character</option>{characters.filter((character) => character.name.trim()).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label> : null}
          <label className="block text-sm font-bold text-stone-800">{line.kind === "dialogue" ? `Dialogue for line ${index + 1}` : `Action for line ${index + 1}`}<textarea value={line.text} maxLength={MINI_PLAY_LINE_LENGTH} rows={2} onChange={(event) => patchLine(line.id, { text: event.target.value })} className={field} placeholder={line.kind === "dialogue" ? "Write what this character says…" : "For example, Mia looks under the bench."} /></label>
          {line.kind === "dialogue" && part.sentenceStarters.length ? <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-violet-800">Sentence starters</summary><div className="flex flex-wrap gap-2">{part.sentenceStarters.map((starter, starterIndex) => <button key={starterIndex} type="button" className={button} onClick={() => patchLine(line.id, { text: `${line.text}${line.text ? " " : ""}${starter}`.slice(0, MINI_PLAY_LINE_LENGTH) })}>{starter}</button>)}</div></details> : null}
          <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={index === 0} onClick={() => moveLine(index, -1)} aria-label={`Move line ${index + 1} up`}>↑ Up</button><button type="button" className={button} disabled={index === lines.length - 1} onClick={() => moveLine(index, 1)} aria-label={`Move line ${index + 1} down`}>↓ Down</button><button type="button" className={button} onClick={() => patchLines(lines.filter((entry) => entry.id !== line.id))} aria-label={`Remove line ${index + 1}`}>Remove line</button></div>
        </fieldset>)}
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={lines.length >= MINI_PLAY_MAX_LINES} onClick={() => addLine("dialogue")}>Add spoken line</button><button type="button" className={button} disabled={lines.length >= MINI_PLAY_MAX_LINES} onClick={() => addLine("direction")}>Add stage direction</button></div>
      </section> : null}
      {step === 3 ? <section className="space-y-4" aria-label="Check play"><h3 className="text-xl font-extrabold text-stone-950">Read your play aloud</h3><p className="text-sm leading-6 text-stone-700">Do the replies make sense together? Can your audience understand the problem and the ending?</p><MiniPlayViewer part={part} answers={answers} />
        <div className="rounded-xl bg-teal-50 p-4"><h4 className="font-bold text-teal-950">Success criteria</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-teal-900">{part.successCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul></div>
        <div aria-live="polite" className={`rounded-xl p-4 ${issues.length ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"}`}><h4 className="font-bold">{issues.length ? "Before you submit" : "Your play is ready to submit"}</h4>{issues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="mt-1 text-sm">Use Submit homework below. Your teacher will read your play.</p>}</div>
      </section> : null}
      <div className="flex justify-between gap-2"><button type="button" className={button} disabled={step === 0} onClick={() => setStep(step - 1)}>Previous section</button><button type="button" className={button} disabled={step === 3} onClick={() => setStep(step + 1)}>Next section</button></div>
    </div>
  );
}
