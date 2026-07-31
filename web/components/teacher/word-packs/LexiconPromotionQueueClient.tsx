"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  approveTeacherLexiconPromotion,
  curriculumUpdateTeacherLexiconEntry,
  rejectTeacherLexiconPromotion,
  returnTeacherLexiconPromotion,
} from "@/lib/actions/teacher-lexicon";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import { LexiconLinkedMediaStrip } from "@/components/teacher/activity-builder/LexiconLinkedMediaStrip";
import {
  promotionStatusLabel,
  teacherLexiconPromotionGaps,
} from "@/lib/vocabulary/teacher-lexicon";

export type LexiconReviewTab = "added" | "submitted" | "approved";

type Props = {
  canReviewAll: boolean;
  added: TeacherLexiconEntry[];
  submitted: TeacherLexiconEntry[];
  approved: TeacherLexiconEntry[];
  initialTab?: LexiconReviewTab;
};

const TAB_COPY: Record<
  LexiconReviewTab,
  { label: string; empty: string; hint: string }
> = {
  added: {
    label: "Added",
    empty: "No unsubmitted dictionary words.",
    hint: "Words teachers added to their dictionary that are not pending review and not approved yet (includes returned / rejected).",
  },
  submitted: {
    label: "Submitted",
    empty: "No pending submissions.",
    hint: "Ready words teachers submitted for curriculum review. Approve publishes to the platform dictionary.",
  },
  approved: {
    label: "Approved",
    empty: "No approved words yet.",
    hint: "Accepted words. New platform ids (`pv_*`) appear here after Approve.",
  },
};

export function LexiconPromotionQueueClient({
  canReviewAll,
  added: initialAdded,
  submitted: initialSubmitted,
  approved: initialApproved,
  initialTab = "submitted",
}: Props) {
  const [tab, setTab] = useState<LexiconReviewTab>(initialTab);
  const [added, setAdded] = useState(initialAdded);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [approved, setApproved] = useState(initialApproved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      added: added.length,
      submitted: submitted.length,
      approved: approved.length,
    }),
    [added.length, submitted.length, approved.length],
  );

  const entries = tab === "added" ? added : tab === "submitted" ? submitted : approved;

  function moveEntry(updated: TeacherLexiconEntry) {
    // Remove from all buckets, then place in the right one.
    const strip = (list: TeacherLexiconEntry[]) => list.filter((e) => e.id !== updated.id);
    let nextAdded = strip(added);
    let nextSubmitted = strip(submitted);
    let nextApproved = strip(approved);

    if (updated.archivedAt || updated.status === "archived") {
      setAdded(nextAdded);
      setSubmitted(nextSubmitted);
      setApproved(nextApproved);
      return;
    }

    if (updated.promotionStatus === "pending") {
      nextSubmitted = [updated, ...nextSubmitted];
    } else if (updated.promotionStatus === "approved") {
      nextApproved = [updated, ...nextApproved];
    } else {
      nextAdded = [updated, ...nextAdded];
    }

    setAdded(nextAdded);
    setSubmitted(nextSubmitted);
    setApproved(nextApproved);
  }

  return (
    <div className="space-y-4">
      {!canReviewAll ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Showing your own words only. Platform admins see every teacher’s dictionary additions here.
        </p>
      ) : (
        <p className="text-sm text-neutral-600">{TAB_COPY[tab].hint}</p>
      )}

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-0">
        {(Object.keys(TAB_COPY) as LexiconReviewTab[]).map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-t border px-3 py-2 text-sm font-semibold ${
                active
                  ? "border-neutral-300 border-b-white bg-white text-neutral-900"
                  : "border-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {TAB_COPY[key].label}{" "}
              <span className={active ? "text-neutral-500" : "text-neutral-400"}>
                ({counts[key]})
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {entries.length === 0 ? (
        <p className="rounded border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
          {TAB_COPY[tab].empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <QueueCard
              key={entry.id}
              entry={entry}
              tab={tab}
              canReviewAll={canReviewAll}
              disabled={pending}
              onError={setError}
              onUpdated={(updated) => {
                setError(null);
                moveEntry(updated);
              }}
              startTransition={startTransition}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-neutral-500">
        Teachers submit from Dictionary when a word is Ready.{" "}
        <Link href="/teacher/word-packs" className="font-medium underline">
          Back to word packs
        </Link>
      </p>
    </div>
  );
}

function QueueCard({
  entry,
  tab,
  canReviewAll,
  disabled,
  onError,
  onUpdated,
  startTransition,
}: {
  entry: TeacherLexiconEntry;
  tab: LexiconReviewTab;
  canReviewAll: boolean;
  disabled: boolean;
  onError: (msg: string | null) => void;
  onUpdated: (entry: TeacherLexiconEntry) => void;
  startTransition: (fn: () => void) => void;
}) {
  const gaps = teacherLexiconPromotionGaps(entry);
  const canEditMeta = canReviewAll && tab !== "approved";
  const canReview = canReviewAll && tab === "submitted" && entry.promotionStatus === "pending";
  const [note, setNote] = useState("");
  const [defEn, setDefEn] = useState(entry.learnerDefinitionEn ?? "");
  const [defVi, setDefVi] = useState(entry.learnerMeaningVi ?? "");
  const [topic, setTopic] = useState(entry.primaryTopic ?? "");
  const [pos, setPos] = useState<string>(entry.pos ?? "unspecified");
  const [stage, setStage] = useState(entry.primaryStage ?? "");

  function saveMeta() {
    startTransition(async () => {
      const result = await curriculumUpdateTeacherLexiconEntry({
        id: entry.id,
        pos,
        primaryStage: stage || null,
        primaryTopic: topic,
        learnerDefinitionEn: defEn,
        learnerMeaningVi: defVi,
      });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onUpdated(result.entry);
    });
  }

  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            {entry.surface}{" "}
            <span className="text-sm font-normal text-neutral-500">
              · {entry.entryKind}
              {entry.pos ? ` · ${entry.pos}` : ""}
              {entry.status === "ready" ? " · ready" : " · draft"}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {promotionStatusLabel(entry.promotionStatus)}
            {entry.promotionSubmittedAt
              ? ` · submitted ${new Date(entry.promotionSubmittedAt).toLocaleString()}`
              : ` · updated ${new Date(entry.updatedAt).toLocaleString()}`}
            {entry.promotedToId ? ` · ${entry.promotedToId}` : ""}
            {" · teacher "}
            <span className="font-mono">{entry.teacherId.slice(0, 8)}…</span>
            {" · "}
            <span className="font-mono">{entry.id}</span>
          </p>
          <div className="mt-2">
            <LexiconLinkedMediaStrip lexiconId={entry.promotedToId ?? entry.id} />
          </div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            entry.promotionStatus === "pending"
              ? "bg-amber-50 text-amber-900"
              : entry.promotionStatus === "returned"
                ? "bg-orange-50 text-orange-900"
                : entry.promotionStatus === "approved"
                  ? "bg-emerald-50 text-emerald-900"
                  : entry.promotionStatus === "rejected"
                    ? "bg-red-50 text-red-800"
                    : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {promotionStatusLabel(entry.promotionStatus)}
        </span>
      </div>

      {gaps.length > 0 ? (
        <p className="mt-2 text-xs text-neutral-600">Gaps: {gaps.join(", ")}</p>
      ) : (
        <p className="mt-2 text-xs text-emerald-800">Metadata looks complete.</p>
      )}

      {entry.promotionReviewNote &&
      (entry.promotionStatus === "returned" || entry.promotionStatus === "rejected") ? (
        <p className="mt-2 rounded border border-orange-200 bg-orange-50 px-2 py-1.5 text-sm text-orange-950">
          Review note: {entry.promotionReviewNote}
        </p>
      ) : null}

      {canEditMeta ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-neutral-700">
            POS
            <select
              value={pos}
              disabled={disabled}
              onChange={(e) => setPos(e.target.value)}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="unspecified">—</option>
              <option value="noun">noun</option>
              <option value="verb">verb</option>
              <option value="adjective">adjective</option>
              <option value="adverb">adverb</option>
              <option value="pronoun">pronoun</option>
              <option value="interjection">interjection</option>
            </select>
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Stage
            <select
              value={stage}
              disabled={disabled}
              onChange={(e) => setStage(e.target.value)}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              <option value="PRE_A1_1">PRE_A1_1</option>
              <option value="PRE_A1_2">PRE_A1_2</option>
              <option value="A1_1">A1_1</option>
              <option value="A1_2">A1_2</option>
              <option value="A2_1">A2_1</option>
              <option value="A2_2">A2_2</option>
            </select>
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Topic
            <input
              value={topic}
              disabled={disabled}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
            Meaning (EN)
            <input
              value={defEn}
              disabled={disabled}
              onChange={(e) => setDefEn(e.target.value)}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Meaning (VI)
            <input
              value={defVi}
              disabled={disabled}
              onChange={(e) => setDefVi(e.target.value)}
              className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="button"
              disabled={disabled}
              onClick={saveMeta}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40"
            >
              Save metadata
            </button>
          </div>

          {canReview ? (
            <>
              <label className="text-xs font-medium text-neutral-700 sm:col-span-2 lg:col-span-3">
                Review note (required for return / reject)
                <input
                  value={note}
                  disabled={disabled}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional for approve"
                  className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await approveTeacherLexiconPromotion(entry.id, note || null);
                      if (!result.ok) {
                        onError(result.error);
                        return;
                      }
                      onUpdated(result.entry);
                    });
                  }}
                  className="rounded bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={disabled || !note.trim()}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await returnTeacherLexiconPromotion(entry.id, note);
                      if (!result.ok) {
                        onError(result.error);
                        return;
                      }
                      onUpdated(result.entry);
                    });
                  }}
                  className="rounded border border-orange-400 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-950 hover:bg-orange-100 disabled:opacity-40"
                >
                  Return
                </button>
                <button
                  type="button"
                  disabled={disabled || !note.trim()}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await rejectTeacherLexiconPromotion(entry.id, note);
                      if (!result.ok) {
                        onError(result.error);
                        return;
                      }
                      onUpdated(result.entry);
                    });
                  }}
                  className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <dl className="mt-3 grid gap-1 text-sm text-neutral-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">EN</dt>
            <dd>{entry.learnerDefinitionEn || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">VI</dt>
            <dd>{entry.learnerMeaningVi || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Topic</dt>
            <dd>{entry.primaryTopic || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Stage</dt>
            <dd>{entry.primaryStage || "—"}</dd>
          </div>
          {entry.promotedToId ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-neutral-500">Platform id</dt>
              <dd className="font-mono text-xs">{entry.promotedToId}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </li>
  );
}
