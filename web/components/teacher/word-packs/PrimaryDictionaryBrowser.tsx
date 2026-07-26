"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import {
  getPrimaryVocabularySearchEntries,
} from "@/lib/vocabulary/primary-candidates";
import {
  archiveTeacherLexiconEntry,
  createTeacherLexiconEntry,
  submitTeacherLexiconForCurriculum,
  updateTeacherLexiconEntry,
  withdrawTeacherLexiconCurriculumSubmission,
} from "@/lib/actions/teacher-lexicon";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import {
  canSubmitForCurriculum,
  canWithdrawCurriculumSubmission,
  collectUnifiedVocabFacets,
  mergeUnifiedVocabEntries,
  promotionStatusLabel,
  searchUnifiedVocab,
  type UnifiedVocabSearchEntry,
} from "@/lib/vocabulary/teacher-lexicon";

export type DictionaryBrowserFilters = {
  query?: string;
  stage?: string;
  pos?: string;
  topic?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialFilters?: DictionaryBrowserFilters;
  packWordIds?: readonly string[];
  onAddToPack?: (wordId: string) => void;
  /** Button label when adding (default Add). */
  addLabel?: string;
  /** Shown when word is already selected (default In pack). */
  alreadyAddedLabel?: string;
  /** Teacher lexicon loaded from server; updated locally after create/edit. */
  teacherEntries: TeacherLexiconEntry[];
  onTeacherEntriesChange: (entries: TeacherLexiconEntry[]) => void;
  /** Static bank + published promotions. */
  platformEntries?: readonly PrimaryVocabularySearchIndexEntry[];
  /** Admin-only: open master topic editor. */
  canEditMaster?: boolean;
  onEditMasterTopics?: () => void;
  /** Hide lexicon review queue link for teacher-light. */
  showLexiconReviewLink?: boolean;
};

const DISPLAY_LIMIT = 400;

export function PrimaryDictionaryBrowser({
  open,
  onClose,
  initialFilters,
  packWordIds = [],
  onAddToPack,
  addLabel = "Add",
  alreadyAddedLabel = "In pack",
  teacherEntries,
  onTeacherEntriesChange,
  platformEntries: platformEntriesProp,
  canEditMaster = false,
  onEditMasterTopics,
  showLexiconReviewLink = true,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const platformEntries = useMemo(
    () => platformEntriesProp ?? getPrimaryVocabularySearchEntries(),
    [platformEntriesProp],
  );
  const inPack = useMemo(() => new Set(packWordIds), [packWordIds]);

  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [stage, setStage] = useState(initialFilters?.stage ?? "");
  const [pos, setPos] = useState(initialFilters?.pos ?? "");
  const [topic, setTopic] = useState(initialFilters?.topic ?? "");
  const [source, setSource] = useState<"all" | "platform" | "teacher">("all");
  const [readyFilter, setReadyFilter] = useState<"all" | "ready" | "draft">("all");

  const [newSurface, setNewSurface] = useState("");
  const [newKind, setNewKind] = useState<"word" | "phrase" | "slang">("word");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createHint, setCreateHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pool = useMemo(
    () => mergeUnifiedVocabEntries(platformEntries, teacherEntries),
    [platformEntries, teacherEntries],
  );
  const facets = useMemo(() => collectUnifiedVocabFacets(pool), [pool]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialFilters?.query ?? "");
    setStage(initialFilters?.stage ?? "");
    setPos(initialFilters?.pos ?? "");
    setTopic(initialFilters?.topic ?? "");
    setCreateError(null);
    setCreateHint(null);
    const t = window.setTimeout(() => addInputRef.current?.focus() ?? closeRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, initialFilters?.query, initialFilters?.stage, initialFilters?.pos, initialFilters?.topic]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const matched = useMemo(() => {
    return searchUnifiedVocab(pool, {
      query: query.trim() || undefined,
      primaryStageCandidate: stage || undefined,
      pos: pos || undefined,
      primaryTopic: topic || undefined,
      source,
      readyForClass: readyFilter,
    });
  }, [pool, query, stage, pos, topic, source, readyFilter]);

  const rows = matched.slice(0, DISPLAY_LIMIT);
  const filtersActive = Boolean(
    query.trim() || stage || pos || topic || source !== "all" || readyFilter !== "all",
  );

  function upsertLocal(entry: TeacherLexiconEntry) {
    onTeacherEntriesChange([
      entry,
      ...teacherEntries.filter((e) => e.id !== entry.id && !e.archivedAt),
    ]);
  }

  function removeLocal(id: string) {
    onTeacherEntriesChange(teacherEntries.filter((e) => e.id !== id));
  }

  function submitNew() {
    const surface = newSurface.trim();
    if (!surface) return;
    setCreateError(null);
    setCreateHint(null);
    startTransition(async () => {
      const result = await createTeacherLexiconEntry({
        surface,
        entryKind: newKind,
        primaryStage: stage || null,
        primaryTopic: topic || null,
      });
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      upsertLocal(result.entry);
      setNewSurface("");
      if (result.platformMatchIds?.length) {
        setCreateHint(
          `Added to your dictionary. Similar platform entry exists (${result.platformMatchIds[0]}).`,
        );
      } else {
        setCreateHint("Added to your dictionary.");
      }
      if (onAddToPack) onAddToPack(result.entry.id);
    });
  }

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-[color:var(--teacher-chrome-page,#f5f5f4)] p-2 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Dictionary
            </h2>
            <p className="text-xs text-neutral-500">
              Platform bank + your words · {matched.length.toLocaleString()} match
              {matched.length === 1 ? "" : "es"}
              {matched.length > DISPLAY_LIMIT
                ? ` · showing first ${DISPLAY_LIMIT.toLocaleString()}`
                : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Close
          </button>
        </header>

        <div className="flex shrink-0 flex-col gap-2 border-b border-neutral-100 px-3 py-2">
          <div className="flex flex-wrap items-end gap-2 rounded border border-dashed border-neutral-300 bg-neutral-50 px-2.5 py-2">
            <label className="min-w-[12rem] flex-1 text-xs font-medium text-neutral-700">
              Add to your dictionary
              <input
                ref={addInputRef}
                value={newSurface}
                onChange={(e) => setNewSurface(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitNew();
                  }
                }}
                placeholder="Word, phrase, or slang…"
                className="mt-1 w-full rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
                disabled={pending}
              />
            </label>
            <label className="text-xs font-medium text-neutral-700">
              Kind
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as "word" | "phrase" | "slang")}
                className="mt-1 block rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                disabled={pending}
              >
                <option value="word">Word</option>
                <option value="phrase">Phrase</option>
                <option value="slang">Slang</option>
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !newSurface.trim()}
              onClick={submitNew}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              {pending ? "Adding…" : "+ Add"}
            </button>
          </div>
          {createError ? <p className="text-xs text-red-700">{createError}</p> : null}
          {createHint ? <p className="text-xs text-emerald-800">{createHint}</p> : null}

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lemma, topic…"
              className="min-w-[10rem] flex-1 rounded border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
              aria-label="Search dictionary by lemma or topic"
              autoComplete="off"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as "all" | "platform" | "teacher")}
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              aria-label="Filter by source"
            >
              <option value="all">All sources</option>
              <option value="platform">Platform</option>
              <option value="teacher">My words</option>
            </select>
            <select
              value={readyFilter}
              onChange={(e) => setReadyFilter(e.target.value as "all" | "ready" | "draft")}
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              aria-label="Filter by ready status"
            >
              <option value="all">Ready: all</option>
              <option value="ready">Ready for class</option>
              <option value="draft">Still drafting</option>
            </select>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
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
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
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
              className="max-w-[12rem] rounded border border-neutral-300 px-2 py-1.5 text-sm"
              aria-label="Filter by topic"
            >
              <option value="">All topics</option>
              {facets.primaryTopic.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStage("");
                  setPos("");
                  setTopic("");
                  setSource("all");
                  setReadyFilter("all");
                }}
                className="text-xs font-semibold text-neutral-600 underline hover:text-neutral-900"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Lemma</th>
                <th className="px-3 py-2 font-semibold">Ready</th>
                <th className="px-3 py-2 font-semibold">POS</th>
                <th className="px-3 py-2 font-semibold">Stage</th>
                <th className="px-3 py-2 font-semibold">Topic</th>
                <th className="px-3 py-2 font-semibold">Meaning (EN)</th>
                <th className="px-3 py-2 font-semibold">Meaning (VI)</th>
                <th className="px-3 py-2 font-semibold">Note</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Curriculum</th>
                <th className="px-3 py-2 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-neutral-500">
                    No matches. Add a custom word above, or try another filter.
                  </td>
                </tr>
              ) : (
                rows.map((entry) => (
                  <DictionaryRow
                    key={entry.id}
                    entry={entry}
                    teacherEntry={
                      entry.source === "teacher"
                        ? teacherEntries.find((t) => t.id === entry.id) ?? null
                        : null
                    }
                    topicOptions={facets.primaryTopic}
                    inPack={inPack.has(entry.id)}
                    onAddToPack={onAddToPack}
                    addLabel={addLabel}
                    alreadyAddedLabel={alreadyAddedLabel}
                    onUpdated={(updated) => upsertLocal(updated)}
                    onArchived={(id) => removeLocal(id)}
                    disabled={pending}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2 text-xs text-neutral-500">
          <span>
            Mark your words <span className="font-semibold">Ready</span>, then{" "}
            <span className="font-semibold">Submit</span> for curriculum review
            {showLexiconReviewLink ? (
              <>
                .{" "}
                <a href="/teacher/dictionary/review" className="font-semibold text-neutral-800 underline">
                  Open review queue
                </a>
              </>
            ) : null}
            .
          </span>
          {canEditMaster && onEditMasterTopics ? (
            <button
              type="button"
              onClick={onEditMasterTopics}
              className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              Edit master topics
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function DictionaryRow({
  entry,
  teacherEntry,
  topicOptions,
  inPack,
  onAddToPack,
  addLabel = "Add",
  alreadyAddedLabel = "In pack",
  onUpdated,
  onArchived,
  disabled,
}: {
  entry: UnifiedVocabSearchEntry;
  teacherEntry: TeacherLexiconEntry | null;
  topicOptions: string[];
  inPack: boolean;
  onAddToPack?: (wordId: string) => void;
  addLabel?: string;
  alreadyAddedLabel?: string;
  onUpdated: (entry: TeacherLexiconEntry) => void;
  onArchived: (id: string) => void;
  disabled: boolean;
}) {
  const [note, setNote] = useState(teacherEntry?.note ?? "");
  const [pos, setPos] = useState<string>(teacherEntry?.pos ?? "unspecified");
  const [stage, setStage] = useState(teacherEntry?.primaryStage ?? "");
  const [topic, setTopic] = useState(teacherEntry?.primaryTopic ?? "");
  const [defEn, setDefEn] = useState(teacherEntry?.learnerDefinitionEn ?? "");
  const [defVi, setDefVi] = useState(teacherEntry?.learnerMeaningVi ?? "");
  const [ready, setReady] = useState(teacherEntry?.status === "ready");
  const [promoStatus, setPromoStatus] = useState(teacherEntry?.promotionStatus ?? "none");
  const [promoNote, setPromoNote] = useState(teacherEntry?.promotionReviewNote ?? "");
  const [, startTransition] = useTransition();
  const isMine = entry.source === "teacher";

  useEffect(() => {
    setNote(teacherEntry?.note ?? "");
    setPos(teacherEntry?.pos ?? "unspecified");
    setStage(teacherEntry?.primaryStage ?? "");
    setTopic(teacherEntry?.primaryTopic ?? "");
    setDefEn(teacherEntry?.learnerDefinitionEn ?? "");
    setDefVi(teacherEntry?.learnerMeaningVi ?? "");
    setReady(teacherEntry?.status === "ready");
    setPromoStatus(teacherEntry?.promotionStatus ?? "none");
    setPromoNote(teacherEntry?.promotionReviewNote ?? "");
  }, [
    teacherEntry?.id,
    teacherEntry?.note,
    teacherEntry?.pos,
    teacherEntry?.primaryStage,
    teacherEntry?.primaryTopic,
    teacherEntry?.learnerDefinitionEn,
    teacherEntry?.learnerMeaningVi,
    teacherEntry?.status,
    teacherEntry?.promotionStatus,
    teacherEntry?.promotionReviewNote,
  ]);

  function savePatch(patch: Parameters<typeof updateTeacherLexiconEntry>[0]) {
    startTransition(async () => {
      const result = await updateTeacherLexiconEntry(patch);
      if (result.ok) onUpdated(result.entry);
    });
  }

  return (
    <tr className="border-t border-neutral-100 hover:bg-neutral-50/80">
      <td className="px-3 py-1.5 font-medium text-neutral-900">
        {entry.lemma}
        {isMine && entry.entryKind && entry.entryKind !== "word" ? (
          <span className="ml-1 text-[10px] font-semibold uppercase text-neutral-500">
            {entry.entryKind}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-1.5">
        {isMine ? (
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
            <input
              type="checkbox"
              checked={ready}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.checked;
                setReady(next);
                savePatch({ id: entry.id, status: next ? "ready" : "teacher_draft" });
              }}
              className="rounded border-neutral-300"
            />
            Ready
          </label>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-neutral-700">
        {isMine ? (
          <select
            value={pos}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              setPos(next);
              savePatch({ id: entry.id, pos: next });
            }}
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
        ) : (
          entry.pos
        )}
      </td>
      <td className="px-3 py-1.5 text-neutral-700">
        {isMine ? (
          <select
            value={stage}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              setStage(next);
              savePatch({ id: entry.id, primaryStage: next || null });
            }}
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
          entry.primaryStageCandidate || "—"
        )}
      </td>
      <td className="px-3 py-1.5">
        {isMine ? (
          <input
            list={`topic-suggestions-${entry.id}`}
            value={topic}
            disabled={disabled}
            onChange={(e) => setTopic(e.target.value)}
            onBlur={() => {
              if ((teacherEntry?.primaryTopic ?? "") === topic.trim()) return;
              savePatch({ id: entry.id, primaryTopic: topic });
            }}
            placeholder="topic"
            className="w-full min-w-[7rem] rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900"
          />
        ) : (
          <span className="text-neutral-700">{entry.primaryTopic || "—"}</span>
        )}
        {isMine ? (
          <datalist id={`topic-suggestions-${entry.id}`}>
            {topicOptions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        ) : null}
      </td>
      <td className="px-3 py-1.5">
        {isMine ? (
          <input
            value={defEn}
            disabled={disabled}
            onChange={(e) => setDefEn(e.target.value)}
            onBlur={() => {
              if ((teacherEntry?.learnerDefinitionEn ?? "") === defEn.trim()) return;
              savePatch({ id: entry.id, learnerDefinitionEn: defEn });
            }}
            placeholder="Short English meaning"
            className="w-full min-w-[10rem] rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900"
          />
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {isMine ? (
          <input
            value={defVi}
            disabled={disabled}
            onChange={(e) => setDefVi(e.target.value)}
            onBlur={() => {
              if ((teacherEntry?.learnerMeaningVi ?? "") === defVi.trim()) return;
              savePatch({ id: entry.id, learnerMeaningVi: defVi });
            }}
            placeholder="Nghĩa tiếng Việt"
            className="w-full min-w-[9rem] rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900"
          />
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {isMine ? (
          <input
            value={note}
            disabled={disabled}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if ((teacherEntry?.note ?? "") === note.trim()) return;
              savePatch({ id: entry.id, note });
            }}
            placeholder="Optional note"
            className="w-full min-w-[7rem] rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900"
          />
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            entry.source === "teacher"
              ? ready
                ? "bg-emerald-50 text-emerald-900"
                : "bg-amber-50 text-amber-900"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {entry.source === "teacher" ? (ready ? "Yours · ready" : "Yours · draft") : "Platform"}
        </span>
      </td>
      <td className="px-3 py-1.5">
        {isMine && teacherEntry ? (
          <div className="flex min-w-[7rem] flex-col gap-1">
            <span className="text-[11px] font-semibold text-neutral-600">
              {promoStatus === "approved" && teacherEntry.promotedToId
                ? `Published · ${teacherEntry.promotedToId}`
                : promotionStatusLabel(promoStatus)}
            </span>
            {promoStatus === "returned" && promoNote ? (
              <span className="max-w-[10rem] truncate text-[10px] text-orange-800" title={promoNote}>
                {promoNote}
              </span>
            ) : null}
            {canSubmitForCurriculum(teacherEntry) ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  startTransition(async () => {
                    const result = await submitTeacherLexiconForCurriculum(entry.id);
                    if (result.ok) onUpdated(result.entry);
                  });
                }}
                className="text-left text-xs font-semibold text-neutral-800 underline hover:text-neutral-950"
              >
                Submit
              </button>
            ) : null}
            {canWithdrawCurriculumSubmission(teacherEntry) ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  startTransition(async () => {
                    const result = await withdrawTeacherLexiconCurriculumSubmission(entry.id);
                    if (result.ok) onUpdated(result.entry);
                  });
                }}
                className="text-left text-xs font-semibold text-neutral-600 underline hover:text-neutral-900"
              >
                Withdraw
              </button>
            ) : null}
          </div>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {onAddToPack ? (
          inPack ? (
            <span className="mr-2 text-xs text-neutral-400">{alreadyAddedLabel}</span>
          ) : (
            <button
              type="button"
              onClick={() => onAddToPack(entry.id)}
              className="mr-2 text-xs font-semibold text-neutral-800 underline hover:text-neutral-950"
            >
              {addLabel}
            </button>
          )
        ) : null}
        {isMine ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!window.confirm(`Archive “${entry.lemma}” from your dictionary?`)) return;
              startTransition(async () => {
                const result = await archiveTeacherLexiconEntry(entry.id);
                if (result.ok) onArchived(entry.id);
              });
            }}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Archive
          </button>
        ) : null}
      </td>
    </tr>
  );
}
