"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, Plus, Save, Trash2 } from "lucide-react";
import styles from "@/components/teacher/activity-builder/reading/ReadingSuite.module.css";
import {
  createDefinitionMatchDraft,
  definitionMatchValidationMessages,
  type DefinitionMatchDocument,
  type DefinitionMatchEntry,
} from "@/lib/activity-builder/reading/definition-match";

const STORAGE_KEY = "wke-admin-reading-definition-match-drafts:v1";
const inputClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

function readDrafts(): DefinitionMatchDocument[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: DefinitionMatchDocument[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function DefinitionMatchWorkspace() {
  const [drafts, setDrafts] = useState<DefinitionMatchDocument[]>([]);
  const [document, setDocument] = useState<DefinitionMatchDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readDrafts();
      setDrafts(stored);
      setDocument(stored[0] ?? createDefinitionMatchDraft());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const errors = useMemo(
    () => document ? definitionMatchValidationMessages(document) : [],
    [document],
  );

  if (!document) {
    return <div className="p-8 text-sm text-stone-500">Opening Reading Builder…</div>;
  }

  const patch = (next: DefinitionMatchDocument) => setDocument(next);
  const patchEntry = (entryId: string, entryPatch: Partial<DefinitionMatchEntry>) => {
    patch({
      ...document,
      content: {
        ...document.content,
        entries: document.content.entries.map((entry) =>
          entry.id === entryId ? { ...entry, ...entryPatch } : entry,
        ),
      },
    });
  };

  const save = () => {
    const next = [document, ...drafts.filter((draft) => draft.id !== document.id)];
    writeDrafts(next);
    setDrafts(next);
    setNotice(errors.length ? "Draft saved. Fix the validation items before review." : "Draft saved and ready for admin review.");
  };

  const newDraft = () => {
    setDocument(createDefinitionMatchDraft());
    setNotice(null);
  };

  const duplicate = () => {
    const clone = structuredClone(document);
    clone.id = crypto.randomUUID();
    clone.title = `${document.title} (copy)`;
    clone.content.entries = clone.content.entries.map((entry) => ({ ...entry, id: crypto.randomUUID() }));
    setDocument(clone);
    setNotice("Copy created. Save it when you are ready.");
  };

  const remove = () => {
    const next = drafts.filter((draft) => draft.id !== document.id);
    writeDrafts(next);
    setDrafts(next);
    setDocument(next[0] ?? createDefinitionMatchDraft());
    setNotice("Draft deleted.");
  };

  return (
    <div className={`${styles.workspace} min-h-0 flex-1 overflow-y-auto bg-stone-50`}>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/teacher/activity-builder" className="text-xs font-semibold text-sky-700 hover:underline">← Activity Builder</Link>
            <h1 className="mt-1 text-xl font-bold text-stone-900">Definition Match</h1>
            <p className="text-xs font-medium text-amber-800">Admin development only · not publishable or assignable</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={newDraft} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Plus className="h-4 w-4" />New</button>
            <button type="button" onClick={duplicate} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Copy className="h-4 w-4" />Duplicate</button>
            <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Trash2 className="h-4 w-4" />Delete</button>
            <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Save draft</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">
        <div className="space-y-4">
          {notice ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{notice}</p> : null}

          <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Activity title<input className={inputClass} value={document.title} onChange={(event) => patch({ ...document, title: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Student instructions<input className={inputClass} value={document.instructions} onChange={(event) => patch({ ...document, instructions: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Learning objective<input className={inputClass} value={document.learningObjective} onChange={(event) => patch({ ...document, learningObjective: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-stone-800">CEFR level<select className={inputClass} value={document.cefrLevel} onChange={(event) => patch({ ...document, cefrLevel: event.target.value as DefinitionMatchDocument["cefrLevel"] })}><option value="pre_a1">Pre-A1</option><option value="a1">A1</option><option value="a2">A2</option></select></label>
            <label className="block text-sm font-semibold text-stone-800">Estimated minutes<input className={inputClass} type="number" min={1} max={20} value={document.estimatedMinutes} onChange={(event) => patch({ ...document, estimatedMinutes: Number(event.target.value) })} /></label>
          </section>

          <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-bold text-stone-900">Words and definitions</h2><p className="text-xs text-stone-500">Use 4–10 unique words. Definitions must not reveal the answer.</p></div>
              <button type="button" disabled={document.content.entries.length >= 10} onClick={() => patch({ ...document, content: { ...document.content, entries: [...document.content.entries, { id: crypto.randomUUID(), word: "", definition: "", example: "" }] } })} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Add word</button>
            </div>
            {document.content.entries.map((entry, index) => (
              <div key={entry.id} className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[minmax(8rem,0.7fr)_minmax(0,1.3fr)_auto]">
                <label className="text-xs font-semibold text-stone-700">Word {index + 1}<input className={inputClass} value={entry.word} onChange={(event) => patchEntry(entry.id, { word: event.target.value })} /></label>
                <label className="text-xs font-semibold text-stone-700">Child-friendly definition<textarea className={inputClass} rows={2} value={entry.definition} onChange={(event) => patchEntry(entry.id, { definition: event.target.value })} /></label>
                <button type="button" disabled={document.content.entries.length <= 4} onClick={() => patch({ ...document, content: { ...document.content, entries: document.content.entries.filter((item) => item.id !== entry.id) } })} className="self-end rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-30" aria-label={`Remove ${entry.word || `word ${index + 1}`}`}><Trash2 className="h-4 w-4" /></button>
                <label className="text-xs font-semibold text-stone-700 sm:col-span-2">Example sentence (optional)<input className={inputClass} value={entry.example ?? ""} onChange={(event) => patchEntry(entry.id, { example: event.target.value })} /></label>
              </div>
            ))}
          </section>

          <section className={`rounded-xl border p-4 ${errors.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">{errors.length ? "Before admin review" : <><Check className="h-4 w-4" />Ready for admin review</>}</h2>
            {errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-1 text-sm text-emerald-900">The draft meets the Primary Definition Match rules.</p>}
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500"><BookOpen className="h-4 w-4" />Primary student preview</div>
          <DefinitionMatchPreview key={document.id} document={document} />
        </aside>
      </div>
    </div>
  );
}

function DefinitionMatchPreview({ document }: { document: DefinitionMatchDocument }) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const usedWords = new Set(Object.values(matches));
  const allCorrect = document.content.entries.length > 0 && document.content.entries.every((entry) => matches[entry.id] === entry.id);

  const chooseDefinition = (entryId: string) => {
    if (!selectedWord) {
      if (matches[entryId]) {
        setMatches((current) => {
          const next = { ...current };
          delete next[entryId];
          return next;
        });
        setMessage("The word is back in the word bank.");
        return;
      }
      setMessage("Choose a word first.");
      return;
    }
    setMatches((current) => ({ ...current, [entryId]: selectedWord }));
    setSelectedWord(null);
    setMessage(null);
  };

  return (
    <div className={`${styles.preview} overflow-hidden rounded-3xl border-4 border-[#241d4f] bg-[#fff8eb] shadow-xl`}>
      <div className="bg-[#6d42c7] px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-wide opacity-80">Reading · {document.cefrLevel.replace("_", "-").toUpperCase()}</p><h2 className="mt-1 text-xl font-black">{document.title || "Definition Match"}</h2><p className="mt-1 text-sm font-bold text-purple-100">{document.instructions}</p></div>
      <div className="space-y-4 p-4 sm:p-5">
        <div><p className="mb-2 text-xs font-black uppercase tracking-wide text-[#5d5278]">Word bank</p><div className="flex flex-wrap gap-2">{document.content.entries.map((entry) => <button key={entry.id} type="button" disabled={usedWords.has(entry.id)} onClick={() => setSelectedWord(entry.id)} className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${selectedWord === entry.id ? "border-[#241d4f] bg-amber-300" : "border-purple-200 bg-white text-[#241d4f]"} disabled:opacity-35`}>{entry.word || "Empty word"}</button>)}</div></div>
        <div className="space-y-2">{document.content.entries.map((entry, index) => { const matched = document.content.entries.find((word) => word.id === matches[entry.id]); return <button key={entry.id} type="button" onClick={() => chooseDefinition(entry.id)} className="grid w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-2xl border-2 border-purple-100 bg-white p-3 text-left shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-sm font-black text-purple-800">{index + 1}</span><span><span className="block text-sm font-bold leading-5 text-[#30284f]">{entry.definition || "Add a definition in the editor."}</span><span className="mt-1 block text-xs font-black text-purple-700">{matched?.word || "Tap to place a word"}</span></span></button>; })}</div>
        {message ? <p className="text-center text-sm font-bold text-amber-800">{message}</p> : null}
        <button type="button" onClick={() => setMessage(allCorrect ? "Great reading! Every match is correct." : "Some matches need another look.")} className="w-full rounded-2xl bg-[#241d4f] px-4 py-3 text-sm font-black text-white">Check my answers</button>
      </div>
    </div>
  );
}
