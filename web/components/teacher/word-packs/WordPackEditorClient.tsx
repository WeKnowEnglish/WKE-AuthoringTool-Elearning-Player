"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getPrimaryVocabularySearchEntries,
  type PrimaryVocabularySearchIndexEntry,
} from "@/lib/vocabulary/primary-candidates";
import {
  archiveTeacherWordPackAndRedirect,
  duplicateTeacherWordPack,
  saveTeacherWordPack,
} from "@/lib/actions/teacher-word-packs";
import type { TeacherWordPackRow } from "@/lib/data/teacher-word-packs";
import { PrimaryDictionaryBrowser } from "@/components/teacher/word-packs/PrimaryDictionaryBrowser";
import { MasterTopicEditor } from "@/components/teacher/word-packs/MasterTopicEditor";
import {
  createTeacherLexiconEntry,
  updateTeacherLexiconEntry,
} from "@/lib/actions/teacher-lexicon";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import {
  collectUnifiedVocabFacets,
  mergeUnifiedVocabEntries,
  resolvePackLexemes,
  resolveSheetSurface,
  searchUnifiedVocab,
  type UnifiedVocabSearchEntry,
} from "@/lib/vocabulary/teacher-lexicon";
import {
  applyMasterOverrides,
  type MasterLexiconOverride,
} from "@/lib/vocabulary/platform-lexicon";

type ClassOption = { id: string; title: string };

type Props = {
  pack: TeacherWordPackRow;
  classes: ClassOption[];
  initialError?: string | null;
  initialTeacherLexicon?: TeacherLexiconEntry[];
  /** Static candidates + published platform promotions (before client override edits). */
  initialPlatformEntries?: readonly PrimaryVocabularySearchIndexEntry[];
  initialMasterOverrides?: readonly MasterLexiconOverride[];
  canEditMaster?: boolean;
  showLexiconReviewLink?: boolean;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const SEARCH_LIMIT = 50;
const WORD_SOFT_CAP = 40;
const BLANK_ROW_COUNT = 8;

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleTimeString();
}

export function WordPackEditorClient({
  pack,
  classes,
  initialError = null,
  initialTeacherLexicon = [],
  initialPlatformEntries,
  initialMasterOverrides = [],
  canEditMaster = false,
  showLexiconReviewLink = true,
}: Props) {
  const router = useRouter();
  const basePlatformEntries = useMemo(
    () => initialPlatformEntries ?? getPrimaryVocabularySearchEntries(),
    [initialPlatformEntries],
  );
  const [masterOverrides, setMasterOverrides] = useState<MasterLexiconOverride[]>([
    ...initialMasterOverrides,
  ]);
  const platformEntries = useMemo(
    () => applyMasterOverrides(basePlatformEntries, masterOverrides),
    [basePlatformEntries, masterOverrides],
  );
  const [teacherLexicon, setTeacherLexicon] = useState<TeacherLexiconEntry[]>(initialTeacherLexicon);

  const activeTeacherLexicon = useMemo(
    () => teacherLexicon.filter((e) => !e.archivedAt && e.status !== "archived"),
    [teacherLexicon],
  );

  const allEntries = useMemo(
    () => mergeUnifiedVocabEntries(platformEntries, activeTeacherLexicon),
    [platformEntries, activeTeacherLexicon],
  );
  const facets = useMemo(() => collectUnifiedVocabFacets(allEntries), [allEntries]);

  const [title, setTitle] = useState(pack.title);
  const [classId, setClassId] = useState<string>(pack.class_id ?? "");
  const [wordIds, setWordIds] = useState<string[]>(pack.word_ids);
  const [notesByWordId, setNotesByWordId] = useState<Record<string, string>>(pack.notes_by_word_id);

  const packRows = useMemo(
    () => resolvePackLexemes(wordIds, platformEntries, teacherLexicon),
    [wordIds, platformEntries, teacherLexicon],
  );
  const missingInPack = useMemo(
    () => packRows.filter((row) => row.source === "missing").length,
    [packRows],
  );
  const archivedInPack = useMemo(
    () => packRows.filter((row) => row.archived).length,
    [packRows],
  );

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("");
  const [pos, setPos] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "platform" | "teacher">("all");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [masterTopicsOpen, setMasterTopicsOpen] = useState(false);
  const [editMyWords, setEditMyWords] = useState(false);
  const teacherWordCount = useMemo(
    () => packRows.filter((row) => row.source === "teacher" && !row.archived).length,
    [packRows],
  );
  const [blankTexts, setBlankTexts] = useState<string[]>(() =>
    Array.from({ length: BLANK_ROW_COUNT }, () => ""),
  );
  const [blankAmbiguous, setBlankAmbiguous] = useState<Record<number, UnifiedVocabSearchEntry[]>>(
    {},
  );
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
  const blankInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(pack.updated_at);
  const [bannerError, setBannerError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const latestPayloadRef = useRef({ title, classId, wordIds, notesByWordId });

  latestPayloadRef.current = { title, classId, wordIds, notesByWordId };

  const filtersActive = Boolean(query.trim() || stage || pos || topic || sourceFilter !== "all");

  const results = useMemo(() => {
    return searchUnifiedVocab(
      allEntries,
      {
        query: query.trim() || undefined,
        primaryStageCandidate: stage || undefined,
        pos: pos || undefined,
        primaryTopic: topic || undefined,
        source: sourceFilter,
      },
      { limit: SEARCH_LIMIT },
    );
  }, [allEntries, query, stage, pos, topic, sourceFilter]);

  const addableResults = useMemo(
    () => results.filter((entry) => !wordIds.includes(entry.id)),
    [results, wordIds],
  );

  const inPack = useMemo(() => new Set(wordIds), [wordIds]);

  const missingBlankCount = useMemo(() => {
    return blankTexts.reduce((count, text) => {
      const resolved = resolveSheetSurface(text, allEntries, { excludeIds: inPack });
      return resolved.status === "missing" ? count + 1 : count;
    }, 0);
  }, [blankTexts, allEntries, inPack]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, stage, pos, topic, sourceFilter]);

  function clearFilters() {
    setQuery("");
    setStage("");
    setPos("");
    setTopic("");
    setSourceFilter("all");
    searchInputRef.current?.focus();
  }
  function markDirty() {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 650);
  }

  async function persist() {
    if (!dirtyRef.current || savingRef.current) return;
    dirtyRef.current = false;
    savingRef.current = true;
    setSaveState("saving");
    setSaveError(null);
    const payload = latestPayloadRef.current;
    try {
      const result = await saveTeacherWordPack({
        packId: pack.id,
        title: payload.title,
        wordIds: payload.wordIds,
        notesByWordId: payload.notesByWordId,
        classId: payload.classId || null,
        portal: "primary",
      });
      if (!result.ok) {
        dirtyRef.current = true;
        setSaveState("error");
        setSaveError(result.error);
        return;
      }
      setLastSavedAt(result.pack.updated_at);
      setSaveState(dirtyRef.current ? "dirty" : "saved");
      router.refresh();
    } catch (err) {
      dirtyRef.current = true;
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      savingRef.current = false;
      if (dirtyRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void persist();
        }, 400);
      }
    }
  }

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        void persist();
      }
    }
    function onPageHide() {
      if (dirtyRef.current) void persist();
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist uses refs
  }, [pack.id]);

  function addWord(id: string) {
    if (inPack.has(id)) return;
    setWordIds((prev) => [...prev, id]);
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1200);
    markDirty();
  }

  function upsertTeacherLexicon(entry: TeacherLexiconEntry) {
    setTeacherLexicon((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
  }

  function saveTeacherWordPatch(
    id: string,
    patch: Parameters<typeof updateTeacherLexiconEntry>[0],
  ) {
    startTransition(async () => {
      const result = await updateTeacherLexiconEntry({ ...patch, id });
      if (result.ok) upsertTeacherLexicon(result.entry);
    });
  }

  function clearBlankRow(index: number) {
    setBlankTexts((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
    setBlankAmbiguous((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function focusBlankRow(index: number) {
    window.setTimeout(() => blankInputRefs.current[index]?.focus(), 0);
  }

  function commitBlankRow(index: number) {
    const text = blankTexts[index] ?? "";
    const resolved = resolveSheetSurface(text, allEntries, { excludeIds: inPack });
    if (resolved.status === "empty") {
      clearBlankRow(index);
      return;
    }
    if (resolved.status === "found") {
      if (inPack.has(resolved.entry.id)) {
        clearBlankRow(index);
        setSheetMessage(`“${resolved.entry.lemma}” is already in this pack.`);
        focusBlankRow(index);
        return;
      }
      addWord(resolved.entry.id);
      clearBlankRow(index);
      setSheetMessage(null);
      focusBlankRow(index);
      return;
    }
    if (resolved.status === "ambiguous") {
      setBlankAmbiguous((prev) => ({ ...prev, [index]: resolved.entries }));
      setSheetMessage(`“${text.trim()}” matches more than one entry — pick one.`);
      return;
    }
    setBlankAmbiguous((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setSheetMessage(`“${resolved.surface}” is not in the dictionary yet.`);
  }

  async function addMissingBlank(index: number) {
    const text = (blankTexts[index] ?? "").trim();
    if (!text) return;
    const resolved = resolveSheetSurface(text, allEntries, { excludeIds: inPack });
    if (resolved.status !== "missing") {
      commitBlankRow(index);
      return;
    }
    setSheetBusy(true);
    setSheetMessage(null);
    try {
      const result = await createTeacherLexiconEntry({ surface: resolved.surface });
      if (!result.ok) {
        setSheetMessage(result.error);
        return;
      }
      setTeacherLexicon((prev) => [result.entry, ...prev.filter((e) => e.id !== result.entry.id)]);
      addWord(result.entry.id);
      clearBlankRow(index);
      setSheetMessage(`Added “${result.entry.surface}” to your dictionary and this pack.`);
      focusBlankRow(index);
    } finally {
      setSheetBusy(false);
    }
  }

  async function addAllMissingBlanks() {
    const missingIndexes: number[] = [];
    blankTexts.forEach((text, index) => {
      const resolved = resolveSheetSurface(text, allEntries, { excludeIds: inPack });
      if (resolved.status === "missing") missingIndexes.push(index);
    });
    if (missingIndexes.length === 0) {
      setSheetMessage("No new words to add from the empty rows.");
      return;
    }
    setSheetBusy(true);
    setSheetMessage(null);
    let added = 0;
    try {
      for (const index of missingIndexes) {
        const text = (blankTexts[index] ?? "").trim();
        if (!text) continue;
        const result = await createTeacherLexiconEntry({ surface: text });
        if (!result.ok) {
          setSheetMessage(result.error);
          break;
        }
        setTeacherLexicon((prev) => [result.entry, ...prev.filter((e) => e.id !== result.entry.id)]);
        addWord(result.entry.id);
        clearBlankRow(index);
        added += 1;
      }
      if (added > 0) {
        setSheetMessage(
          `Added ${added} new word${added === 1 ? "" : "s"} to your dictionary and this pack.`,
        );
      }
    } finally {
      setSheetBusy(false);
    }
  }

  function addHighlightedOrFirst() {
    const target = addableResults[highlightIndex] ?? addableResults[0];
    if (!target) return;
    addWord(target.id);
  }

  function removeWord(id: string) {
    setWordIds((prev) => prev.filter((x) => x !== id));
    setNotesByWordId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    markDirty();
  }

  function moveWord(id: string, direction: -1 | 1) {
    setWordIds((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(nextIndex, 0, row!);
      return next;
    });
    markDirty();
  }

  async function copyLemmas() {
    const text = packRows.map((row) => row.lemma).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setBannerError("Couldn’t copy to clipboard.");
    }
  }

  function saveStatusLabel(): string {
    if (saveState === "saving") return "Saving…";
    if (saveState === "dirty") return "Unsaved changes";
    if (saveState === "error") return saveError ? `Couldn’t save: ${saveError}` : "Couldn’t save";
    if (lastSavedAt) return `Saved ${formatRelativeTime(lastSavedAt)}`;
    return "All changes saved";
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <PrimaryDictionaryBrowser
        open={dictionaryOpen}
        onClose={() => setDictionaryOpen(false)}
        initialFilters={{ query, stage, pos, topic }}
        packWordIds={wordIds}
        platformEntries={platformEntries}
        canEditMaster={canEditMaster}
        showLexiconReviewLink={showLexiconReviewLink}
        onEditMasterTopics={() => {
          setDictionaryOpen(false);
          setMasterTopicsOpen(true);
        }}
        onAddToPack={(id) => {
          addWord(id);
        }}
        teacherEntries={activeTeacherLexicon}
        onTeacherEntriesChange={(entries) => {
          const archivedKeep = teacherLexicon.filter(
            (e) =>
              (Boolean(e.archivedAt) || e.status === "archived") && wordIds.includes(e.id),
          );
          const byId = new Map(entries.map((e) => [e.id, e]));
          for (const archived of archivedKeep) {
            if (!byId.has(archived.id)) byId.set(archived.id, archived);
          }
          setTeacherLexicon([...byId.values()]);
        }}
      />
      {canEditMaster ? (
        <MasterTopicEditor
          open={masterTopicsOpen}
          onClose={() => setMasterTopicsOpen(false)}
          platformEntries={basePlatformEntries}
          initialOverrides={masterOverrides}
          topicOptions={facets.primaryTopic}
          onOverridesChange={setMasterOverrides}
        />
      ) : null}
      {bannerError ? (
        <p className="shrink-0 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {bannerError === "archive_failed"
            ? "Couldn’t archive this pack."
            : bannerError === "duplicate_failed"
              ? "Couldn’t duplicate this pack."
              : bannerError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setBannerError(null)}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <Link href="/teacher/word-packs" className="shrink-0 text-sm font-medium text-neutral-600 hover:text-neutral-900">
            ← Packs
          </Link>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            onBlur={() => {
              if (dirtyRef.current) void persist();
            }}
            className="min-w-[10rem] max-w-md flex-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-lg font-bold text-neutral-900 outline-none focus:border-neutral-900"
            placeholder="Pack title"
            aria-label="Pack title"
          />
          <label className="flex items-center gap-1.5 text-sm text-neutral-700">
            <span className="font-medium">Class</span>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                markDirty();
              }}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">Not linked</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          {classId ? (
            <Link href={`/teacher/classes/${classId}`} className="text-sm text-blue-700 underline">
              Open class
            </Link>
          ) : null}
          <p
            className={`text-sm ${
              saveState === "error"
                ? "text-red-700"
                : saveState === "dirty"
                  ? "text-amber-700"
                  : "text-neutral-500"
            }`}
            aria-live="polite"
          >
            {saveStatusLabel()}
          </p>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            disabled={saveState === "saving"}
            onClick={() => {
              dirtyRef.current = true;
              void persist();
            }}
          >
            Save now
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={wordIds.length === 0}
            onClick={() => void copyLemmas()}
            className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40"
          >
            {copied ? "Copied" : "Copy lemmas"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                void duplicateTeacherWordPack(pack.id);
              });
            }}
            className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Duplicate
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Archive this pack? You can still keep class history; the pack leaves your active list.")) {
                return;
              }
              startTransition(() => {
                void archiveTeacherWordPackAndRedirect(pack.id);
              });
            }}
            className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Archive
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Find words</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Click to add · Enter adds · ↑↓ to move
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-neutral-600 underline hover:text-neutral-900"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDictionaryOpen(true)}
                className="rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                Open Dictionary
              </button>
            </div>
          </div>
          <div className="mt-2 shrink-0 space-y-2">
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIndex((i) => Math.min(i + 1, Math.max(addableResults.length - 1, 0)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  addHighlightedOrFirst();
                }
              }}
              placeholder="Search lemma, topic…"
              className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
              aria-label="Search lemmas and topics"
              autoComplete="off"
            />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as "all" | "platform" | "teacher")}
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                aria-label="Filter by source"
              >
                <option value="all">All sources</option>
                <option value="platform">Platform</option>
                <option value="teacher">My words</option>
              </select>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                aria-label="Filter by stage"
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
                onChange={(e) => setPos(e.target.value)}
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                aria-label="Filter by part of speech"
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
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                aria-label="Filter by topic"
              >
                <option value="">All topics</option>
                {facets.primaryTopic.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul
            className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label="Search results"
          >
            {results.length === 0 ? (
              <li className="px-1 py-3 text-sm text-neutral-500">No matches. Try another filter.</li>
            ) : (
              results.map((entry) => {
                const added = inPack.has(entry.id);
                const addableIndex = addableResults.findIndex((r) => r.id === entry.id);
                const highlighted = !added && addableIndex === highlightIndex;
                return (
                  <li key={entry.id} role="option" aria-selected={highlighted}>
                    <button
                      type="button"
                      disabled={added}
                      onMouseEnter={() => {
                        if (!added && addableIndex >= 0) setHighlightIndex(addableIndex);
                      }}
                      onClick={() => addWord(entry.id)}
                      className={`flex w-full flex-col rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        added
                          ? "cursor-default bg-neutral-50 text-neutral-400"
                          : highlighted
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-900 hover:bg-neutral-100"
                      }`}
                    >
                      <span className={`font-semibold ${highlighted && !added ? "text-white" : ""}`}>
                        {entry.lemma}{" "}
                        <span className={`font-normal ${highlighted && !added ? "text-neutral-300" : "text-neutral-500"}`}>
                          · {entry.pos === "unspecified" ? "—" : entry.pos}
                          {entry.source === "teacher" ? " · yours" : ""}
                          {entry.source === "teacher" && entry.readyForClass ? " · ready" : ""}
                        </span>
                      </span>
                      <span className={`text-xs ${highlighted && !added ? "text-neutral-300" : "text-neutral-500"}`}>
                        {entry.primaryStageCandidate || "—"} · {entry.primaryTopic || "—"}
                        {entry.definitionEn ? ` · ${entry.definitionEn}` : ""}
                        {added ? " · in pack" : ""}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {results.length >= SEARCH_LIMIT ? (
            <p className="mt-1 shrink-0 text-xs text-neutral-500">
              Showing first {SEARCH_LIMIT}. Narrow filters to see more.
            </p>
          ) : null}
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
            <h2 className="text-sm font-bold text-neutral-900">
              Pack sheet{" "}
              <span className="font-normal text-neutral-500">
                ({wordIds.length} word{wordIds.length === 1 ? "" : "s"})
              </span>
              {wordIds.length >= WORD_SOFT_CAP ? (
                <span className="ml-2 font-normal text-amber-700">Large pack — consider splitting</span>
              ) : null}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {teacherWordCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setEditMyWords((v) => !v)}
                  className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                    editMyWords
                      ? "border-amber-700 bg-amber-50 text-amber-950"
                      : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                  aria-pressed={editMyWords}
                >
                  {editMyWords ? "Done editing my words" : `Edit my words (${teacherWordCount})`}
                </button>
              ) : null}
              {missingBlankCount > 0 ? (
                <button
                  type="button"
                  disabled={sheetBusy}
                  onClick={() => void addAllMissingBlanks()}
                  className="rounded border border-neutral-900 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
                >
                  {sheetBusy ? "Adding…" : `Add all new (${missingBlankCount})`}
                </button>
              ) : null}
              <p className="text-xs text-neutral-500">
                {editMyWords
                  ? "Your words are unlocked — edit cells, then blur to save"
                  : "Type below to pull from dictionary"}
              </p>
            </div>
          </div>

          {sheetMessage ? (
            <p className="shrink-0 border-b border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700">
              {sheetMessage}
            </p>
          ) : null}

          {missingInPack > 0 ? (
            <p className="shrink-0 border-b border-amber-100 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              {missingInPack} id{missingInPack === 1 ? "" : "s"} in this pack could not be resolved — remove or
              restore them.
            </p>
          ) : null}
          {archivedInPack > 0 ? (
            <p className="shrink-0 border-b border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
              {archivedInPack} archived dictionary word{archivedInPack === 1 ? "" : "s"} still listed here.
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Lemma</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Ready</th>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">POS</th>
                  <th className="px-3 py-2 font-semibold">Stage</th>
                  <th className="px-3 py-2 font-semibold">Topic</th>
                  <th className="px-3 py-2 font-semibold">Meaning</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                  <th className="px-3 py-2 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {packRows.map((row, index) => {
                  const flashing = flashId === row.id;
                  const displayNote = notesByWordId[row.id] ?? "";
                  const placeholderNote =
                    !displayNote && row.note ? `Dict: ${row.note}` : "Optional note";
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-neutral-100 ${
                        flashing
                          ? "bg-emerald-50"
                          : row.source === "missing"
                            ? "bg-amber-50/60"
                            : row.archived
                              ? "bg-neutral-50"
                              : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 tabular-nums text-neutral-500">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-neutral-900">
                        {row.source === "missing" ? (
                          <span className="text-amber-800" title={row.id}>
                            Missing · {row.id}
                          </span>
                        ) : (
                          <>
                            {row.lemma}
                            {row.archived ? (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase text-neutral-500">
                                Archived
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                            row.source === "teacher"
                              ? "bg-amber-50 text-amber-900"
                              : row.source === "missing"
                                ? "bg-amber-100 text-amber-950"
                                : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {row.source === "teacher"
                            ? "Yours"
                            : row.source === "missing"
                              ? "Missing"
                              : row.promotedToId
                                ? "Platform · linked"
                                : "Platform"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-neutral-700">
                        {row.source === "teacher" && editMyWords && !row.archived ? (
                          <label className="inline-flex items-center gap-1.5 font-semibold text-neutral-700">
                            <input
                              type="checkbox"
                              checked={row.readyForClass}
                              onChange={(e) =>
                                saveTeacherWordPatch(row.id, {
                                  id: row.id,
                                  status: e.target.checked ? "ready" : "teacher_draft",
                                })
                              }
                              className="rounded border-neutral-300"
                            />
                            Ready
                          </label>
                        ) : row.source === "teacher" ? (
                          row.readyForClass ? (
                            <span className="text-emerald-800">Ready</span>
                          ) : (
                            <span className="text-amber-800">Draft</span>
                          )
                        ) : row.source === "platform" ? (
                          <span className="text-neutral-400">—</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {row.source === "teacher" && editMyWords && !row.archived ? (
                          <select
                            value={row.entryKind ?? "word"}
                            onChange={(e) =>
                              saveTeacherWordPatch(row.id, {
                                id: row.id,
                                entryKind: e.target.value as TeacherLexiconEntry["entryKind"],
                              })
                            }
                            className="rounded border border-neutral-200 bg-white px-1 py-0.5 text-sm"
                          >
                            <option value="word">word</option>
                            <option value="phrase">phrase</option>
                            <option value="slang">slang</option>
                            <option value="name">name</option>
                            <option value="other">other</option>
                          </select>
                        ) : row.source === "teacher" ? (
                          row.entryKind ?? "word"
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {row.source === "teacher" && editMyWords && !row.archived ? (
                          <select
                            value={!row.pos || row.pos === "unspecified" ? "unspecified" : row.pos}
                            onChange={(e) =>
                              saveTeacherWordPatch(row.id, { id: row.id, pos: e.target.value })
                            }
                            className="rounded border border-neutral-200 bg-white px-1 py-0.5 text-sm"
                          >
                            <option value="unspecified">—</option>
                            <option value="noun">noun</option>
                            <option value="verb">verb</option>
                            <option value="adjective">adjective</option>
                            <option value="adverb">adverb</option>
                            <option value="pronoun">pronoun</option>
                            <option value="interjection">interjection</option>
                          </select>
                        ) : !row.pos || row.pos === "unspecified" ? (
                          "—"
                        ) : (
                          row.pos
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {row.source === "teacher" && editMyWords && !row.archived ? (
                          <select
                            value={row.primaryStageCandidate || ""}
                            onChange={(e) =>
                              saveTeacherWordPatch(row.id, {
                                id: row.id,
                                primaryStage: e.target.value || null,
                              })
                            }
                            className="rounded border border-neutral-200 bg-white px-1 py-0.5 text-sm"
                          >
                            <option value="">—</option>
                            <option value="PRE_A1_1">PRE_A1_1</option>
                            <option value="PRE_A1_2">PRE_A1_2</option>
                            <option value="A1_1">A1_1</option>
                            <option value="A1_2">A1_2</option>
                            <option value="A2_1">A2_1</option>
                            <option value="A2_2">A2_2</option>
                          </select>
                        ) : (
                          row.primaryStageCandidate || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {row.source === "teacher" && editMyWords && !row.archived ? (
                          <PackTeacherTextCell
                            key={`${row.id}-topic-${row.primaryTopic}`}
                            initialValue={row.primaryTopic || ""}
                            placeholder="topic"
                            ariaLabel={`Topic for ${row.lemma}`}
                            onCommit={(value) =>
                              saveTeacherWordPatch(row.id, {
                                id: row.id,
                                primaryTopic: value,
                              })
                            }
                          />
                        ) : (
                          row.primaryTopic || "—"
                        )}
                      </td>
                      <td className="max-w-[12rem] px-3 py-2 text-neutral-600">
                        {row.source === "teacher" && editMyWords && !row.archived ? (
                          <PackTeacherTextCell
                            key={`${row.id}-def-${row.definitionEn ?? ""}`}
                            initialValue={row.definitionEn ?? ""}
                            placeholder="Short English meaning"
                            ariaLabel={`Meaning for ${row.lemma}`}
                            className="min-w-[10rem]"
                            onCommit={(value) =>
                              saveTeacherWordPatch(row.id, {
                                id: row.id,
                                learnerDefinitionEn: value,
                              })
                            }
                          />
                        ) : (
                          <span className="truncate" title={row.definitionEn ?? ""}>
                            {row.source === "teacher" ? row.definitionEn || "—" : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={displayNote}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNotesByWordId((prev) => ({ ...prev, [row.id]: value }));
                            markDirty();
                          }}
                          onBlur={() => {
                            if (dirtyRef.current) void persist();
                          }}
                          placeholder={placeholderNote}
                          className="w-full min-w-[10rem] rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900"
                          aria-label={`Notes for ${row.lemma}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          type="button"
                          className="mr-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
                          disabled={index === 0}
                          onClick={() => moveWord(row.id, -1)}
                          aria-label={`Move ${row.lemma} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="mr-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
                          disabled={index === packRows.length - 1}
                          onClick={() => moveWord(row.id, 1)}
                          aria-label={`Move ${row.lemma} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-700 hover:text-red-900"
                          onClick={() => removeWord(row.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {blankTexts.map((text, blankIndex) => {
                  const rowNumber = packRows.length + blankIndex + 1;
                  const resolved = resolveSheetSurface(text, allEntries, { excludeIds: inPack });
                  const ambiguous = blankAmbiguous[blankIndex] ?? [];
                  const isMissing = resolved.status === "missing";
                  const isAmbiguous = resolved.status === "ambiguous" || ambiguous.length > 0;
                  return (
                    <tr
                      key={`blank-${blankIndex}`}
                      className={`border-t border-dashed border-neutral-200 ${
                        isMissing ? "bg-amber-50/40" : "bg-neutral-50/40"
                      }`}
                    >
                      <td className="px-3 py-2 tabular-nums text-neutral-400">{rowNumber}</td>
                      <td className="px-3 py-2" colSpan={isAmbiguous || isMissing ? 1 : 1}>
                        <input
                          ref={(el) => {
                            blankInputRefs.current[blankIndex] = el;
                          }}
                          value={text}
                          disabled={sheetBusy}
                          onChange={(e) => {
                            const value = e.target.value;
                            setBlankTexts((prev) => {
                              const next = [...prev];
                              next[blankIndex] = value;
                              return next;
                            });
                            setBlankAmbiguous((prev) => {
                              if (!(blankIndex in prev)) return prev;
                              const next = { ...prev };
                              delete next[blankIndex];
                              return next;
                            });
                            setSheetMessage(null);
                          }}
                          onBlur={() => commitBlankRow(blankIndex)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitBlankRow(blankIndex);
                            }
                          }}
                          placeholder="Type a word…"
                          className="w-full min-w-[10rem] rounded border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-900"
                          aria-label={`Add word on row ${rowNumber}`}
                        />
                        {ambiguous.length > 0 ? (
                          <select
                            className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs"
                            defaultValue=""
                            onChange={(e) => {
                              const id = e.target.value;
                              if (!id) return;
                              addWord(id);
                              clearBlankRow(blankIndex);
                              setSheetMessage(null);
                              focusBlankRow(blankIndex);
                            }}
                            aria-label="Choose matching dictionary entry"
                          >
                            <option value="">Choose match…</option>
                            {ambiguous.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.lemma}
                                {entry.pos && entry.pos !== "unspecified" ? ` · ${entry.pos}` : ""}
                                {entry.primaryTopic ? ` · ${entry.primaryTopic}` : ""}
                                {entry.source === "teacher" ? " · yours" : ""}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-400" colSpan={isMissing ? 7 : 8}>
                        {isMissing
                          ? "Not in dictionary"
                          : isAmbiguous
                            ? "Multiple matches"
                            : text.trim()
                              ? "Press Enter to look up"
                              : "Empty row"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {isMissing ? (
                          <button
                            type="button"
                            disabled={sheetBusy}
                            onClick={() => void addMissingBlank(blankIndex)}
                            className="text-xs font-semibold text-neutral-900 underline hover:text-neutral-700 disabled:opacity-40"
                          >
                            Add word
                          </button>
                        ) : text.trim() ? (
                          <button
                            type="button"
                            disabled={sheetBusy}
                            onClick={() => commitBlankRow(blankIndex)}
                            className="text-xs font-semibold text-neutral-700 underline hover:text-neutral-900 disabled:opacity-40"
                          >
                            Look up
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {packRows.length === 0 ? (
              <p className="border-t border-neutral-100 px-3 py-3 text-xs text-neutral-500">
                Type words in the empty rows, or use Find words / Open Dictionary on the left.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Local text cell that only saves on blur when the value actually changed. */
function PackTeacherTextCell({
  initialValue,
  placeholder,
  ariaLabel,
  className = "",
  onCommit,
}: {
  initialValue: string;
  placeholder: string;
  ariaLabel: string;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value.trim() === initialValue.trim()) return;
        onCommit(value);
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`w-full rounded border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-900 ${className}`}
    />
  );
}
