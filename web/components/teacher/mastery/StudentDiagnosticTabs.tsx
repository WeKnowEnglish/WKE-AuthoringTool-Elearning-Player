"use client";

import { useMemo, useState } from "react";
import type { LearningStrandAssessment } from "@/lib/learning-strands";
import {
  filterVocabularyRows,
  formatRelativeDate,
  formatShortDate,
  stateDistributionEntries,
  type GrammarTableRow,
  type TeacherProgressNarrative,
  type VocabularyFilter,
  type VocabularyTableRow,
} from "@/lib/mastery/teacher-mastery-display";
import type { TeacherStudentMasteryDiagnostic } from "@/lib/mastery/teacher-mastery-summary";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  KpiStatCard,
  MasteryScoreBar,
  MasteryStateChip,
  RubricBadge,
  SignalChip,
} from "@/components/teacher/mastery/MasteryUiPrimitives";
import { SentenceReviewTable } from "@/components/teacher/sentence/SentenceReviewTable";
import type { TeacherSentenceSubmission } from "@/lib/data/teacher-sentence-submissions";

type TabId = "overview" | "vocabulary" | "grammar" | "skills" | "writing";

const TAB_LABELS: Record<TabId, string> = {
  overview: "Overview",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  skills: "Skills",
  writing: "Writing",
};

const VOCAB_FILTERS: Array<{ id: VocabularyFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "weak", label: "Weak" },
  { id: "due", label: "Due review" },
  { id: "fragile", label: "Fragile" },
  { id: "mastered", label: "Mastered" },
];

type Props = {
  classId: string;
  diagnostic: TeacherStudentMasteryDiagnostic;
  strands: LearningStrandAssessment[];
  vocabularyRows: VocabularyTableRow[];
  grammarRows: GrammarTableRow[];
  records: StudentMasteryRecord[];
  narrative: TeacherProgressNarrative;
  sentenceSubmissions: TeacherSentenceSubmission[];
  initialTab?: TabId;
};

function StrandMiniCard({ strand }: { strand: LearningStrandAssessment }) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">{strand.strandLabel}</p>
        <RubricBadge levelId={strand.level.id} label={strand.level.label} />
      </div>
      <div className="mt-2">
        <MasteryScoreBar score={strand.masteryScore} />
      </div>
    </div>
  );
}

function StateDistributionBar({
  countsByState,
}: {
  countsByState: TeacherStudentMasteryDiagnostic["countsByState"];
}) {
  const entries = stateDistributionEntries(countsByState);
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  if (total === 0) return null;

  const colors: Record<string, string> = {
    new: "bg-neutral-300",
    introduced: "bg-sky-400",
    practicing: "bg-blue-500",
    developing: "bg-amber-500",
    secure: "bg-emerald-500",
    needs_review: "bg-orange-500",
    stuck: "bg-rose-600",
  };

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100">
        {entries.map((entry) => (
          <div
            key={entry.state}
            className={colors[entry.state] ?? "bg-neutral-400"}
            style={{ width: `${(entry.count / total) * 100}%` }}
            title={`${entry.label}: ${entry.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
        {entries.map((entry) => (
          <span key={entry.state}>
            {entry.label} ({entry.count})
          </span>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({
  diagnostic,
  strands,
  narrative,
}: Pick<Props, "diagnostic" | "strands" | "narrative">) {
  if (diagnostic.recordCount === 0) {
    return (
      <div className="rounded border border-dashed bg-neutral-50 px-4 py-8 text-sm text-neutral-700">
        <p className="font-medium">No mastery evidence yet.</p>
        <p className="mt-2">
          The student may not have practiced while signed in, or data has not synced yet. Ask them
          to sign in before practice so progress saves to their account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard label="Weak words" value={diagnostic.weakWords.length} />
        <KpiStatCard label="Due review" value={diagnostic.dueReview.length} />
        <KpiStatCard label="Fragile" value={diagnostic.fragile.length} />
        <KpiStatCard label="Grammar gaps" value={diagnostic.grammarWeak.length} />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Skills at a glance</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {strands.map((strand) => (
            <StrandMiniCard key={strand.strandId} strand={strand} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900">Mastery state mix</h3>
        <StateDistributionBar countsByState={diagnostic.countsByState} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900">Progress summary</h3>
        <p className="text-sm leading-relaxed text-neutral-700">{narrative.summary}</p>
      </section>

      {narrative.actions.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-900">Priority actions</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {narrative.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VocabularyTab({
  vocabularyRows,
  records,
}: Pick<Props, "vocabularyRows" | "records">) {
  const [filter, setFilter] = useState<VocabularyFilter>("all");
  const filtered = useMemo(
    () => filterVocabularyRows(vocabularyRows, filter, records),
    [filter, records, vocabularyRows],
  );
  const displayRows = filtered.slice(0, 25);

  if (vocabularyRows.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No vocabulary evidence yet. Word practice will appear as students complete vocab activities.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VOCAB_FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === chip.id ?
                "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filtered.length > 25 && (
        <p className="text-xs text-neutral-500">
          Showing top 25 of {filtered.length} words in this filter.
        </p>
      )}

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-neutral-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Word</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">State</th>
              <th className="px-4 py-3 font-semibold">Signal</th>
              <th className="px-4 py-3 font-semibold">Exposure</th>
              <th className="px-4 py-3 font-semibold">Last seen</th>
              <th className="px-4 py-3 font-semibold">Next review</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.wordItemId} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">{row.lemma}</td>
                <td className="px-4 py-3">
                  <MasteryScoreBar score={row.masteryScore} />
                </td>
                <td className="px-4 py-3">
                  <MasteryStateChip state={row.state} />
                </td>
                <td className="px-4 py-3">
                  {row.signal ? <SignalChip label={row.signal} /> : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.exposureCount}</td>
                <td className="px-4 py-3 text-neutral-600">{formatRelativeDate(row.lastSeenAt)}</td>
                <td className="px-4 py-3 text-neutral-600">{formatShortDate(row.nextReviewAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GrammarTab({ grammarRows }: Pick<Props, "grammarRows">) {
  if (grammarRows.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No grammar evidence yet. Grammar practice will appear as students complete poster quizzes.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-neutral-50 text-neutral-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Concept</th>
            <th className="px-4 py-3 font-semibold">Score</th>
            <th className="px-4 py-3 font-semibold">State</th>
            <th className="px-4 py-3 font-semibold">Exposure</th>
            <th className="px-4 py-3 font-semibold">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {grammarRows.map((row) => (
            <tr key={row.targetKey} className="border-b last:border-b-0">
              <td className="px-4 py-3 font-medium">{row.label}</td>
              <td className="px-4 py-3">
                <MasteryScoreBar score={row.masteryScore} />
              </td>
              <td className="px-4 py-3">
                <MasteryStateChip state={row.state} />
              </td>
              <td className="px-4 py-3 tabular-nums">{row.exposureCount}</td>
              <td className="px-4 py-3 text-neutral-600">{formatRelativeDate(row.lastSeenAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkillsTab({ strands }: Pick<Props, "strands">) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {strands.map((strand) => (
        <div key={strand.strandId} className="rounded border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold text-neutral-900">{strand.strandLabel}</h3>
            <RubricBadge levelId={strand.level.id} label={strand.level.label} />
          </div>
          <div className="mt-3">
            <MasteryScoreBar score={strand.masteryScore} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600">
            <div>
              <dt className="font-medium text-neutral-700">Confidence</dt>
              <dd className="tabular-nums">{Math.round(strand.confidence * 100)}%</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-700">Evidence</dt>
              <dd className="tabular-nums">{strand.evidenceCount} attempts</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-neutral-700">{strand.level.teacherMeaning}</p>
          <p className="mt-2 text-sm font-medium text-neutral-900">
            Next move: <span className="font-normal">{strand.level.nextMove}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function StudentDiagnosticTabs(props: Props) {
  const pendingWritingCount = useMemo(
    () => props.sentenceSubmissions.filter((submission) => submission.status === "submitted").length,
    [props.sentenceSubmissions],
  );
  const [tab, setTab] = useState<TabId>(props.initialTab ?? "overview");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`rounded px-3 py-1.5 text-sm font-semibold ${
              tab === tabId ?
                "bg-neutral-900 text-white"
              : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {TAB_LABELS[tabId]}
            {tabId === "writing" && pendingWritingCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                {pendingWritingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          diagnostic={props.diagnostic}
          strands={props.strands}
          narrative={props.narrative}
        />
      )}
      {tab === "vocabulary" && (
        <VocabularyTab vocabularyRows={props.vocabularyRows} records={props.records} />
      )}
      {tab === "grammar" && <GrammarTab grammarRows={props.grammarRows} />}
      {tab === "skills" && <SkillsTab strands={props.strands} />}
      {tab === "writing" && (
        <SentenceReviewTable classId={props.classId} submissions={props.sentenceSubmissions} />
      )}
    </div>
  );
}
