"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { saveMasterLexiconOverrides } from "@/lib/actions/platform-lexicon-overrides";
import { TopicTagsInput } from "@/components/teacher/word-packs/TopicTagsInput";
import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import {
  entryMatchesTopicFilter,
  normalizeTopicTag,
  type MasterLexiconOverride,
} from "@/lib/vocabulary/platform-lexicon";

type Props = {
  open: boolean;
  onClose: () => void;
  platformEntries: readonly PrimaryVocabularySearchIndexEntry[];
  initialOverrides: readonly MasterLexiconOverride[];
  topicOptions: readonly string[];
  onOverridesChange: (overrides: MasterLexiconOverride[]) => void;
};

const DISPLAY_LIMIT = 300;

type RowDraft = {
  id: string;
  primaryTopic: string;
  topics: string[];
};

export function MasterTopicEditor({
  open,
  onClose,
  platformEntries,
  initialOverrides,
  topicOptions,
  onOverridesChange,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [topic, setTopic] = useState("animals_nature");
  const [mode, setMode] = useState<"both" | "primary" | "contains">("contains");
  const [lemmaQuery, setLemmaQuery] = useState("");
  const [browseUntagged, setBrowseUntagged] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [overrides, setOverrides] = useState<MasterLexiconOverride[]>([...initialOverrides]);
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overrideById = useMemo(() => new Map(overrides.map((o) => [o.id, o])), [overrides]);

  const effectiveEntries = useMemo(() => {
    return platformEntries.map((entry) => {
      const o = overrideById.get(entry.id);
      if (!o) return entry;
      const primaryTopic = o.primaryTopic?.trim() || entry.primaryTopic;
      const topics = o.topics.length > 0 ? o.topics : primaryTopic ? [primaryTopic] : entry.topics;
      return { ...entry, primaryTopic, topics };
    });
  }, [platformEntries, overrideById]);

  const facetTopics = useMemo(() => {
    const set = new Set<string>(topicOptions);
    for (const e of effectiveEntries) {
      if (e.primaryTopic) set.add(e.primaryTopic);
      for (const t of e.topics) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [effectiveEntries, topicOptions]);

  const rows = useMemo(() => {
    const q = lemmaQuery.trim().toLowerCase();
    const topicNorm = normalizeTopicTag(topic) ?? topic.trim().toLowerCase();

    let list: PrimaryVocabularySearchIndexEntry[];
    if (browseUntagged) {
      list = [...effectiveEntries];
      if (q) {
        list = list.filter(
          (e) => e.lemma.toLowerCase().includes(q) || e.normalizedLemma.includes(q),
        );
      } else {
        // Without a lemma query, surface general_language rows for retagging.
        list = list.filter(
          (e) =>
            e.primaryTopic === "general_language" ||
            (e.topics.length === 1 && e.topics[0] === "general_language"),
        );
      }
    } else {
      list = effectiveEntries.filter((e) => {
        if (topicNorm && !entryMatchesTopicFilter(e, topicNorm, mode)) return false;
        if (q && !e.lemma.toLowerCase().includes(q) && !e.normalizedLemma.includes(q)) {
          return false;
        }
        return true;
      });
    }
    return list.slice(0, DISPLAY_LIMIT);
  }, [effectiveEntries, topic, mode, lemmaQuery, browseUntagged]);

  useEffect(() => {
    if (!open) return;
    setOverrides([...initialOverrides]);
    setDrafts({});
    setSaveError(null);
    setSaveHint(null);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, initialOverrides]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function rowDraft(entry: PrimaryVocabularySearchIndexEntry): RowDraft {
    const existing = drafts[entry.id];
    if (existing) return existing;
    return {
      id: entry.id,
      primaryTopic: entry.primaryTopic,
      topics: [...entry.topics],
    };
  }

  function queueSave(next: RowDraft) {
    const primary = normalizeTopicTag(next.primaryTopic) ?? next.primaryTopic.trim();
    const topics = [...next.topics];
    if (primary && !topics.includes(primary)) topics.unshift(primary);

    setDrafts((prev) => ({
      ...prev,
      [next.id]: { ...next, primaryTopic: primary || next.primaryTopic, topics },
    }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        setSaveError(null);
        const result = await saveMasterLexiconOverrides([
          {
            id: next.id,
            primaryTopic: primary || null,
            topics,
          },
        ]);
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }
        const byId = new Map(overridesRef.current.map((o) => [o.id, o]));
        for (const o of result.overrides) byId.set(o.id, o);
        const merged = [...byId.values()];
        overridesRef.current = merged;
        setOverrides(merged);
        queueMicrotask(() => onOverridesChange(merged));
        setSaveHint("Saved");
      });
    }, 500);
  }

  function addTopicTagToRow(entry: PrimaryVocabularySearchIndexEntry, tag: string) {
    const normalized = normalizeTopicTag(tag);
    if (!normalized) return;
    const draft = rowDraft(entry);
    const topics = [...draft.topics];
    if (!topics.includes(normalized)) topics.push(normalized);
    const next = {
      ...draft,
      topics,
      primaryTopic:
        draft.primaryTopic === "general_language" ? normalized : draft.primaryTopic || normalized,
    };
    queueSave(next);
  }

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-[color:var(--teacher-chrome-page,#f5f5f4)] p-2 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
          <div>
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Edit master topics
            </h2>
            <p className="text-xs text-neutral-500">
              Admin overrides only — candidate JSON stays unchanged. {rows.length.toLocaleString()} row
              {rows.length === 1 ? "" : "s"}
              {rows.length >= DISPLAY_LIMIT ? ` (showing first ${DISPLAY_LIMIT})` : ""}
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

        <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-neutral-100 px-3 py-2">
          <label className="text-xs font-medium text-neutral-700">
            Topic
            <input
              list="master-topic-options"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 block min-w-[12rem] rounded border border-neutral-300 px-2.5 py-1.5 text-sm"
              placeholder="animals_nature"
            />
            <datalist id="master-topic-options">
              {facetTopics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Match
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "both" | "primary" | "contains")}
              className="mt-1 block rounded border border-neutral-300 px-2 py-1.5 text-sm"
              disabled={browseUntagged}
            >
              <option value="contains">Primary or tags</option>
              <option value="primary">Primary only</option>
              <option value="both">Primary or tags</option>
            </select>
          </label>
          <label className="min-w-[10rem] flex-1 text-xs font-medium text-neutral-700">
            Lemma filter
            <input
              value={lemmaQuery}
              onChange={(e) => setLemmaQuery(e.target.value)}
              placeholder="e.g. cat"
              className="mt-1 w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 pb-1.5 text-xs font-semibold text-neutral-700">
            <input
              type="checkbox"
              checked={browseUntagged}
              onChange={(e) => setBrowseUntagged(e.target.checked)}
              className="rounded border-neutral-300"
            />
            Find lemmas to tag
          </label>
          <span className="pb-1.5 text-xs text-neutral-500">
            {pending ? "Saving…" : saveError ? saveError : saveHint}
          </span>
        </div>

        {saveError ? (
          <p className="shrink-0 border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
            {saveError}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Lemma</th>
                <th className="px-3 py-2 font-semibold">POS</th>
                <th className="px-3 py-2 font-semibold">Stage</th>
                <th className="px-3 py-2 font-semibold">Main topic</th>
                <th className="px-3 py-2 font-semibold">Subtopics</th>
                <th className="px-3 py-2 font-semibold">Quick</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-neutral-500">
                    No rows. Try another topic, enable “Find lemmas to tag”, or search a lemma like
                    cat.
                  </td>
                </tr>
              ) : (
                rows.map((entry) => {
                  const draft = rowDraft(entry);
                  const hasOverride = overrideById.has(entry.id);
                  return (
                    <tr key={entry.id} className="border-t border-neutral-100 hover:bg-neutral-50/80">
                      <td className="px-3 py-1.5 font-medium text-neutral-900">
                        {entry.lemma}
                        {hasOverride ? (
                          <span className="ml-1 text-[10px] font-semibold uppercase text-emerald-700">
                            override
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 text-neutral-600">{entry.pos}</td>
                      <td className="px-3 py-1.5 text-neutral-600">{entry.primaryStageCandidate}</td>
                      <td className="px-3 py-1.5">
                        <input
                          list="master-topic-options"
                          value={draft.primaryTopic}
                          disabled={pending}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [entry.id]: { ...draft, primaryTopic: e.target.value },
                            }))
                          }
                          onBlur={(e) =>
                            queueSave({
                              id: entry.id,
                              primaryTopic: e.target.value,
                              topics: draft.topics,
                            })
                          }
                          className="w-full min-w-[9rem] rounded border border-neutral-200 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <TopicTagsInput
                          tags={draft.topics}
                          disabled={pending}
                          suggestions={facetTopics}
                          lockedTags={
                            draft.primaryTopic
                              ? [normalizeTopicTag(draft.primaryTopic) ?? draft.primaryTopic]
                              : []
                          }
                          placeholder="pets, farm…"
                          onChange={(topics) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [entry.id]: { ...draft, topics },
                            }))
                          }
                          onCommit={(topics) =>
                            queueSave({
                              id: entry.id,
                              primaryTopic: draft.primaryTopic,
                              topics,
                            })
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        {topic.trim() ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => addTopicTagToRow(entry, topic)}
                            className="text-xs font-semibold text-neutral-800 underline hover:text-neutral-950"
                          >
                            + {normalizeTopicTag(topic) ?? topic}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="shrink-0 border-t border-neutral-100 px-3 py-2 text-xs text-neutral-500">
          Tip: set <span className="font-semibold">Main topic</span>, then add{" "}
          <span className="font-semibold">Subtopics</span> as chips (Enter / comma). Or use{" "}
          <span className="font-semibold">Find lemmas to tag</span> + Quick{" "}
          <span className="font-semibold">+</span> to stamp the filter topic. Autosaves.
        </footer>
      </div>
    </div>
  );
}
