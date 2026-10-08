"use client";

import { lazy, Suspense, useEffect, useRef, useState, useTransition } from "react";
import { getStudioVocabularyList, listStudioVocabularyLists, type StudioVocabularyListRef } from "@/lib/activity-library/vocabulary-list-studio";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { getLessonVocabularyEditorContext } from "@/lib/actions/lesson-vocabulary";
import { selectLessonVocabularyEntries, type LessonVocabularyFormat, type LessonVocabularySource } from "@/lib/class-lessons/vocabulary";

const VocabularyListWorkspace = lazy(() => import("@/components/teacher/activity-builder/VocabularyListWorkspace").then((module) => ({ default: module.VocabularyListWorkspace })));
type EditorContext = Awaited<ReturnType<typeof getLessonVocabularyEditorContext>>;
type Props = {
  sources: LessonVocabularySource[];
  usedSourceIds: string[];
  disabled: boolean;
  full: boolean;
  onSourcesChange: (sources: LessonVocabularySource[]) => void;
  onGenerate: (input: { vocabListId: string; selectedEntryIds: string[]; format: LessonVocabularyFormat; operationId: string }) => Promise<void>;
};

const buttonClass = "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";

export function LessonVocabularyPanel({ sources, usedSourceIds, disabled, full, onSourcesChange, onGenerate }: Props) {
  const [lists, setLists] = useState<StudioVocabularyListRef[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [attachId, setAttachId] = useState("");
  const [activeId, setActiveId] = useState(sources[0]?.vocabListId ?? "");
  const [document, setDocument] = useState<VocabularyListDocument | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ listId: string | null; context: EditorContext } | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const retryRef = useRef<{ key: string; id: string } | null>(null);
  const sourceRef = useRef(sources);
  sourceRef.current = sources;
  const busy = disabled || pending || editorLoading;

  useEffect(() => {
    let cancelled = false;
    setLoadingLists(true);
    void listStudioVocabularyLists().then((rows) => { if (!cancelled) setLists(rows); })
      .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load vocabulary lists."); })
      .finally(() => { if (!cancelled) setLoadingLists(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setDocument(null);
    setSelectedIds([]);
    if (!activeId) { setLoadingDocument(false); return; }
    setLoadingDocument(true);
    void getStudioVocabularyList(activeId).then((loaded) => {
      if (!cancelled) {
        setDocument(loaded.document);
        setSelectedIds(loaded.document.entries.filter((entry) => entry.word.trim()).map((entry) => entry.id));
      }
    }).catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load this list."); })
      .finally(() => { if (!cancelled) setLoadingDocument(false); });
    return () => { cancelled = true; };
  }, [activeId, refreshKey]);

  const openEditor = (listId: string | null) => {
    setError(null);
    setEditorLoading(true);
    startTransition(async () => {
      try { setEditor({ listId, context: await getLessonVocabularyEditorContext() }); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "Could not open the vocabulary editor."); }
      finally { setEditorLoading(false); }
    });
  };

  const onListSaved = (entry: StudioVocabularyListRef) => {
    const source = { vocabListId: entry.id, name: entry.name };
    const current = sourceRef.current;
    const next = current.some((row) => row.vocabListId === entry.id)
      ? current.map((row) => row.vocabListId === entry.id ? source : row)
      : [...current, source];
    sourceRef.current = next;
    onSourcesChange(next);
    setActiveId(entry.id);
  };

  const generate = (format: LessonVocabularyFormat) => {
    if (!document || busy) return;
    setError(null);
    try { selectLessonVocabularyEntries(document, selectedIds, format); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Check the selected words."); return; }
    const key = JSON.stringify([activeId, format, [...selectedIds].sort(), document]);
    if (retryRef.current?.key !== key) retryRef.current = { key, id: crypto.randomUUID() };
    const operationId = retryRef.current.id;
    startTransition(async () => {
      try {
        await onGenerate({ vocabListId: activeId, selectedEntryIds: selectedIds, format, operationId });
        retryRef.current = null;
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not generate this material. Try again."); }
    });
  };

  if (editor) return (
    <section aria-label="Lesson vocabulary editor" className="rounded-xl border border-neutral-200 bg-white">
      <Suspense fallback={<p role="status" className="p-4">Opening vocabulary editor…</p>}>
        <VocabularyListWorkspace
          variant="overlay" openLibraryId={editor.listId} startBlank={!editor.listId}
          saveOnClose
          {...editor.context}
          onSaved={onListSaved}
          onClose={() => { setEditor(null); setRefreshKey((value) => value + 1); }}
        />
      </Suspense>
    </section>
  );

  return (
    <section aria-labelledby="lesson-vocabulary-heading" className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/30 p-4">
      <div>
        <h3 id="lesson-vocabulary-heading" className="text-base font-bold text-neutral-900">Lesson vocabulary</h3>
        <p className="mt-1 text-sm text-neutral-600">Load words once, then use them to prepare flashcards and an independent vocabulary check.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1 text-sm font-semibold">
          Existing vocabulary list
          <select value={attachId} disabled={busy || loadingLists} onChange={(event) => setAttachId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2">
            <option value="">{loadingLists ? "Loading lists…" : "Choose a saved list"}</option>
            {lists.filter((list) => !sources.some((source) => source.vocabListId === list.id)).map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </label>
        <button type="button" className={buttonClass} disabled={busy || !attachId || sources.length >= 20} onClick={() => {
          const list = lists.find((row) => row.id === attachId);
          if (!list) return;
          onSourcesChange([...sources, { vocabListId: list.id, name: list.name }]);
          setActiveId(list.id); setAttachId(""); setError(null);
        }}>Attach list</button>
        <button type="button" className={buttonClass} disabled={busy || sources.length >= 20} onClick={() => openEditor(null)}>{editorLoading ? "Opening…" : "+ Create vocabulary list"}</button>
        <button type="button" className={buttonClass} disabled={busy || loadingLists} onClick={() => { setError(null); setRefreshKey((value) => value + 1); }}>Reload lists</button>
      </div>
      {!sources.length ? <p className="text-sm text-neutral-600">Attach a list or create one using the dictionary, custom words, pictures, and audio.</p> : (
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Content for this activity
            <select value={activeId} disabled={busy} onChange={(event) => { setActiveId(event.target.value); setError(null); }} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2">
              {sources.map((source) => <option key={source.vocabListId} value={source.vocabListId}>{source.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} disabled={busy || !activeId} onClick={() => openEditor(activeId)}>Edit vocabulary list</button>
            <button type="button" className={buttonClass} disabled={busy || !activeId || usedSourceIds.includes(activeId)} onClick={() => {
              const next = sources.filter((source) => source.vocabListId !== activeId);
              onSourcesChange(next); setActiveId(next[0]?.vocabListId ?? ""); setError(null);
            }}>Detach list</button>
            {usedSourceIds.includes(activeId) ? <p className="self-center text-xs text-neutral-600">Remove its generated lesson steps before detaching this list.</p> : null}
          </div>
          {loadingDocument ? <p role="status">Loading words…</p> : document ? (
            <fieldset disabled={busy} className="space-y-2">
              <legend className="text-sm font-semibold">Words for the next activity ({selectedIds.length} selected)</legend>
              <div className="flex gap-3 text-sm">
                <button type="button" className="font-semibold text-teal-800 underline" onClick={() => setSelectedIds(document.entries.filter((entry) => entry.word.trim()).map((entry) => entry.id))}>Select all words</button>
                <button type="button" className="font-semibold text-teal-800 underline" onClick={() => setSelectedIds([])}>Clear selection</button>
              </div>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-2">
                {document.entries.filter((entry) => entry.word.trim()).map((entry) => (
                  <label key={entry.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, entry.id] : current.filter((id) => id !== entry.id))} className="mt-1" />
                    <span><span className="font-semibold">{entry.word}</span><span className="block text-xs text-neutral-500">{entry.definitionEn || (entry.imageUrl ? "Picture available" : entry.example || "Add a meaning, example, or picture")}</span></span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className={buttonClass} disabled={!selectedIds.length || full} onClick={() => generate("flashcards")}>Generate flashcards</button>
                <button type="button" className={buttonClass} disabled={selectedIds.length < 2 || full} onClick={() => generate("multiple_choice")}>Generate vocabulary check</button>
              </div>
              <p className="text-xs text-neutral-600">Generation saves your plan and adds a material to its sequence. Flashcards need two card faces. Checks need at least two distinct words, each with a definition or picture.</p>
              {full ? <p className="text-sm text-neutral-700">This lesson has 20 steps. Remove a step before generating another.</p> : null}
            </fieldset>
          ) : null}
        </div>
      )}
      {pending && !editorLoading ? <p role="status" className="text-sm text-teal-900">Saving the plan and preparing the material…</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
