"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrimaryDictionaryBrowser } from "@/components/teacher/word-packs/PrimaryDictionaryBrowser";
import { createTeacherLexiconEntry } from "@/lib/actions/teacher-lexicon";
import { vocabListFieldsFromLexiconId } from "@/lib/activity-builder/vocabulary-list";
import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list";
import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import {
  collectUnifiedVocabFacets,
  mergeUnifiedVocabEntries,
  resolveSheetSurface,
  searchUnifiedVocab,
  type UnifiedVocabSearchEntry,
} from "@/lib/vocabulary/teacher-lexicon";

const SEARCH_LIMIT = 40;

type Props = {
  document: VocabularyListDocument;
  /** Functional update so rapid multi-adds don't drop rows. */
  onAddFields: (
    fields: Omit<VocabListEntry, "id">,
  ) => { ok: true; entryId: string } | { ok: false; reason: string };
  initialPlatformEntries?: readonly PrimaryVocabularySearchIndexEntry[];
  initialTeacherLexicon?: readonly TeacherLexiconEntry[];
  showLexiconReviewLink?: boolean;
};

export function VocabularyListLexiconPicker({
  document,
  onAddFields,
  initialPlatformEntries,
  initialTeacherLexicon = [],
  showLexiconReviewLink = true,
}: Props) {
  const platformEntries = useMemo(
    () => initialPlatformEntries ?? getPrimaryVocabularySearchEntries(),
    [initialPlatformEntries],
  );
  const [teacherLexicon, setTeacherLexicon] = useState<TeacherLexiconEntry[]>([
    ...initialTeacherLexicon,
  ]);

  useEffect(() => {
    setTeacherLexicon([...initialTeacherLexicon]);
  }, [initialTeacherLexicon]);

  const activeTeacher = useMemo(
    () => teacherLexicon.filter((entry) => !entry.archivedAt && entry.status !== "archived"),
    [teacherLexicon],
  );
  const allEntries = useMemo(
    () => mergeUnifiedVocabEntries(platformEntries, activeTeacher),
    [platformEntries, activeTeacher],
  );
  const facets = useMemo(() => collectUnifiedVocabFacets(allEntries), [allEntries]);

  const inList = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of document.entries) {
      if (entry.sourceWordId) ids.add(entry.sourceWordId);
    }
    return ids;
  }, [document.entries]);

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [pos, setPos] = useState("");
  const [topic, setTopic] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "platform" | "teacher">("all");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [sheetText, setSheetText] = useState("");
  const [sheetAmbiguous, setSheetAmbiguous] = useState<UnifiedVocabSearchEntry[]>([]);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [pickerNotice, setPickerNotice] = useState<string | null>(null);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () =>
      searchUnifiedVocab(
        allEntries,
        {
          query: query.trim() || undefined,
          primaryStageCandidate: stage || undefined,
          pos: pos || undefined,
          primaryTopic: topic || undefined,
          source: sourceFilter,
        },
        { limit: SEARCH_LIMIT },
      ),
    [allEntries, query, stage, pos, topic, sourceFilter],
  );

  const addableResults = useMemo(
    () => results.filter((entry) => !inList.has(entry.id)),
    [results, inList],
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, stage, pos, topic, sourceFilter]);

  function upsertTeacher(entry: TeacherLexiconEntry) {
    setTeacherLexicon((prev) => [entry, ...prev.filter((row) => row.id !== entry.id)]);
  }

  function addWordId(wordId: string): boolean {
    const fields = vocabListFieldsFromLexiconId(wordId, teacherLexicon, platformEntries);
    if (!fields) {
      setPickerNotice("Could not resolve that dictionary word.");
      return false;
    }
    const result = onAddFields(fields);
    if (!result.ok) {
      setPickerNotice(
        result.reason === "duplicate_source" || result.reason === "duplicate_word"
          ? `“${fields.word}” is already in this list.`
          : "Could not add that word.",
      );
      return false;
    }
    setPickerNotice(null);
    return true;
  }

  function commitSheet() {
    const resolved = resolveSheetSurface(sheetText, allEntries, { excludeIds: inList });
    if (resolved.status === "empty") {
      setSheetText("");
      setSheetAmbiguous([]);
      return;
    }
    if (resolved.status === "found") {
      if (addWordId(resolved.entry.id)) {
        setSheetText("");
        setSheetAmbiguous([]);
        sheetInputRef.current?.focus();
      }
      return;
    }
    if (resolved.status === "ambiguous") {
      setSheetAmbiguous(resolved.entries);
      setPickerNotice(`“${sheetText.trim()}” matches more than one entry — pick one.`);
      return;
    }
    setSheetAmbiguous([]);
    setPickerNotice(`“${resolved.surface}” is not in the dictionary yet.`);
  }

  async function addMissingFromSheet() {
    const resolved = resolveSheetSurface(sheetText, allEntries, { excludeIds: inList });
    if (resolved.status !== "missing") {
      commitSheet();
      return;
    }
    setSheetBusy(true);
    setPickerNotice(null);
    try {
      const created = await createTeacherLexiconEntry({ surface: resolved.surface });
      if (!created.ok) {
        setPickerNotice(created.error);
        return;
      }
      upsertTeacher(created.entry);
      const fields = vocabListFieldsFromLexiconId(
        created.entry.id,
        [created.entry, ...teacherLexicon],
        platformEntries,
      );
      if (!fields) {
        setPickerNotice("Created the dictionary word, but could not add it to the list.");
        return;
      }
      const result = onAddFields(fields);
      if (!result.ok) {
        setPickerNotice(`“${fields.word}” is already in this list.`);
        return;
      }
      setSheetText("");
      setSheetAmbiguous([]);
      setPickerNotice(null);
      sheetInputRef.current?.focus();
    } finally {
      setSheetBusy(false);
    }
  }

  const sheetResolved = resolveSheetSurface(sheetText, allEntries, { excludeIds: inList });

  return (
    <section className="flex h-full min-h-0 flex-col bg-white px-3 py-3">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Dictionary picker
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Search Primary candidates and your words. Snapshots fill word / definition /
            example — you can still edit them on Word details.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
          onClick={() => setDictionaryOpen(true)}
        >
          Browse dictionary
        </button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightIndex((index) =>
                    Math.min(index + 1, Math.max(0, addableResults.length - 1)),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightIndex((index) => Math.max(0, index - 1));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const target = addableResults[highlightIndex] ?? addableResults[0];
                  if (target) addWordId(target.id);
                }
              }}
              placeholder="Search dictionary…"
              className="min-w-[12rem] flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              aria-label="Stage filter"
            >
              <option value="">All stages</option>
              {facets.primaryStageCandidate.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={pos}
              onChange={(event) => setPos(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              aria-label="Part of speech filter"
            >
              <option value="">All POS</option>
              {facets.pos.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              aria-label="Topic filter"
            >
              <option value="">All topics</option>
              {facets.primaryTopic.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value as "all" | "platform" | "teacher")
              }
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              aria-label="Source filter"
            >
              <option value="all">All sources</option>
              <option value="platform">Primary</option>
              <option value="teacher">My words</option>
            </select>
          </div>

          <ul className="max-h-[min(28rem,55vh)] overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/70">
            {addableResults.length === 0 ? (
              <li className="px-3 py-4 text-xs text-stone-500">
                {query.trim() || stage || pos || topic || sourceFilter !== "all"
                  ? "No matches to add."
                  : "Type to search, or browse the full dictionary."}
              </li>
            ) : (
              addableResults.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => addWordId(entry.id)}
                    onMouseEnter={() => setHighlightIndex(index)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                      index === highlightIndex ? "bg-sky-50" : "hover:bg-white"
                    }`}
                  >
                    <span className="min-w-0 truncate font-medium text-stone-900">
                      {entry.lemma}
                      <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-stone-500">
                        {entry.source === "teacher" ? "mine" : "primary"}
                        {entry.pos ? ` · ${entry.pos}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-sky-800">Add</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Type a word
          </p>
          <div className="flex flex-wrap gap-1.5">
            <input
              ref={sheetInputRef}
              value={sheetText}
              onChange={(event) => {
                setSheetText(event.target.value);
                setSheetAmbiguous([]);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitSheet();
                }
              }}
              placeholder="e.g. bakery"
              className="min-w-[10rem] flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
            <button
              type="button"
              className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              disabled={sheetBusy || !sheetText.trim()}
              onClick={() => commitSheet()}
            >
              Add
            </button>
            {sheetResolved.status === "missing" ? (
              <button
                type="button"
                className="rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-950 disabled:opacity-40"
                disabled={sheetBusy}
                onClick={() => void addMissingFromSheet()}
              >
                {sheetBusy ? "Saving…" : "Add to my dictionary"}
              </button>
            ) : null}
          </div>
          {sheetAmbiguous.length > 0 ? (
            <ul className="space-y-1">
              {sheetAmbiguous.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="text-xs font-semibold text-sky-800 underline"
                    onClick={() => {
                      if (addWordId(entry.id)) {
                        setSheetText("");
                        setSheetAmbiguous([]);
                      }
                    }}
                  >
                    {entry.lemma}
                    {entry.pos ? ` (${entry.pos})` : ""} ·{" "}
                    {entry.source === "teacher" ? "mine" : "primary"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {pickerNotice ? (
        <button
          type="button"
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left text-xs text-amber-950"
          onClick={() => setPickerNotice(null)}
        >
          {pickerNotice} ×
        </button>
      ) : null}

      <PrimaryDictionaryBrowser
        open={dictionaryOpen}
        onClose={() => setDictionaryOpen(false)}
        packWordIds={[...inList]}
        onAddToPack={(wordId) => {
          addWordId(wordId);
        }}
        addLabel="Add to list"
        alreadyAddedLabel="In list"
        teacherEntries={teacherLexicon}
        onTeacherEntriesChange={setTeacherLexicon}
        platformEntries={platformEntries}
        showLexiconReviewLink={showLexiconReviewLink}
      />
    </section>
  );
}
