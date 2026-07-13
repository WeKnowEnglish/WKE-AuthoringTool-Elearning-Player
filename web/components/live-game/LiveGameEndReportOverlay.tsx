"use client";

import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { useLiveGameReport } from "@/lib/live-game/hooks/useLiveGameReport";
import type {
  LiveGameContributionSummary,
  LiveGameLearningBreakdown,
  LiveGameQuestionOutcome,
} from "@/lib/live-game/reports/types";

type Props = {
  sessionId: string;
  objectiveCompleted: boolean;
  isHost: boolean;
  onPlayAgain?: () => void;
};

const ACTION_LABELS = { harvest: "Gather", deposit: "Spell & store", craft: "Build sentences" } as const;
const OUTCOME_LABELS: Record<LiveGameQuestionOutcome["status"], string> = {
  first_try: "Correct first try",
  after_practice: "Correct after practice",
  supported: "Correct with support",
  keep_practicing: "Keep practicing",
  skipped: "Skipped",
  not_completed: "Not completed",
};

function total(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function ContributionCards({ contributions }: { contributions: LiveGameContributionSummary }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {([
        ["Gathered", total(contributions.harvested)],
        ["Deposited", total(contributions.deposited)],
        ["Crafted", total(contributions.crafted)],
      ] as const).map(([label, value]) => (
        <div key={label} className="rounded-xl bg-sky-50 px-3 py-3 text-center">
          <p className="text-2xl font-black tabular-nums text-sky-950">{value}</p>
          <p className="text-xs font-bold text-sky-800">{label}</p>
        </div>
      ))}
    </div>
  );
}

function TargetRows({ rows }: { rows: LiveGameLearningBreakdown[] }) {
  if (!rows.length) return <p className="text-sm font-semibold text-slate-500">Not enough question evidence yet.</p>;
  return <div className="space-y-2">{rows.map((row) => (
    <div key={row.key} className="rounded-xl border border-slate-200 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-slate-900">{row.label}</p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold uppercase text-slate-600">
          {row.action.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        {row.independent} independent · {row.supported} supported · {row.unresolved} to revisit
      </p>
    </div>
  ))}</div>;
}

function QuestionRows({ questions }: { questions: LiveGameQuestionOutcome[] }) {
  if (!questions.length) return <p className="text-sm font-semibold text-slate-500">No questions were opened this round.</p>;
  return <div className="space-y-2">{questions.map((question) => (
    <details key={question.challengeId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900">{question.prompt}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{ACTION_LABELS[question.bank]} · {question.actionContext}</p>
          </div>
          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-1 text-xs font-extrabold text-sky-900">{OUTCOME_LABELS[question.status]}</span>
        </div>
      </summary>
      <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
        {question.answers.length ? <p><span className="font-bold">Your answer{question.answers.length > 1 ? "s" : ""}:</span> {question.answers.map((answer) => answer.selectedAnswer || "—").join(" → ")}</p> : null}
        <p className="mt-1"><span className="font-bold">Correct answer:</span> {question.correctAnswer}</p>
      </div>
    </details>
  ))}</div>;
}

export function LiveGameEndReportOverlay({ sessionId, objectiveCompleted, isHost, onPlayAgain }: Props) {
  const { report, error, loading, retry } = useLiveGameReport(sessionId);
  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] overflow-y-auto bg-slate-950/90 p-3 sm:p-6">
      <KidConfetti active={objectiveCompleted} />
      <main className="mx-auto w-full max-w-5xl rounded-3xl border-4 border-sky-950 bg-white p-4 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="live-game-report-title">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-sky-700">Round {report?.roundNumber ?? ""} learning report</p>
            <h2 id="live-game-report-title" className="mt-1 text-3xl font-black text-slate-950">{objectiveCompleted ? "Team escaped!" : "Round complete"}</h2>
            {report ? <p className="mt-2 max-w-2xl font-semibold text-slate-600">{report.classTitle ? `${report.classTitle} · ` : ""}{report.questionSetTitle} · {report.level} · {report.learningObjective}</p> : null}
          </div>
          <div className="flex gap-2">
            {isHost && onPlayAgain ? <KidButton variant="primary" onClick={onPlayAgain}>Play again</KidButton> : null}
            <Link href="/live-game"><KidButton variant="secondary">Leave</KidButton></Link>
          </div>
        </header>

        {loading ? <div className="py-16 text-center font-extrabold text-slate-600">Preparing the learning report…</div> : null}
        {error ? <div className="py-12 text-center"><p className="font-bold text-red-700">{error}</p><KidButton className="mt-4" variant="secondary" onClick={retry}>Try again</KidButton></div> : null}

        {report?.role === "student" ? <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-5">
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-bold text-sky-200">Your learning evidence</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-3xl font-black">{report.personal.firstTrySolved}</p><p className="text-xs font-bold text-slate-300">First try</p></div>
                <div><p className="text-3xl font-black">{report.personal.independentSolved}</p><p className="text-xs font-bold text-slate-300">Independent</p></div>
                <div><p className="text-3xl font-black">{report.personal.unresolvedEncounters}</p><p className="text-xs font-bold text-slate-300">Revisit</p></div>
              </div>
            </div>
            <ContributionCards contributions={report.personal.contributions} />
            <div><h3 className="mb-3 text-lg font-black text-slate-950">Learning target</h3><TargetRows rows={report.personal.targets} /></div>
          </section>
          <section><h3 className="mb-3 text-lg font-black text-slate-950">Your question review</h3><QuestionRows questions={report.personal.questions} /></section>
        </div> : null}

        {report?.role === "host" ? <div className="mt-6 space-y-7">
          <section className="grid gap-3 sm:grid-cols-4">
            {([
              ["Students", report.team.participantCount],
              ["Question encounters", report.team.totalEncounters],
              ["Independent completions", report.team.independentCompletions],
              ["Needs follow-up", report.team.unresolvedEncounters],
            ] as const).map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-3xl font-black">{value}</p><p className="text-xs font-bold text-slate-300">{label}</p></div>)}
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div><h3 className="mb-3 text-lg font-black text-slate-950">Class learning target</h3><TargetRows rows={report.targets} /></div>
            <div><h3 className="mb-3 text-lg font-black text-slate-950">Team contributions</h3><ContributionCards contributions={report.team.contributions} /></div>
          </section>
          <section>
            <h3 className="mb-3 text-lg font-black text-slate-950">Student evidence <span className="text-sm font-semibold text-slate-500">(alphabetical, not ranked)</span></h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">Student</th><th className="p-3">First try</th><th className="p-3">Independent</th><th className="p-3">Supported</th><th className="p-3">Revisit</th><th className="p-3">Contribution</th></tr></thead><tbody>{report.students.map((student) => <tr key={student.playerId} className="border-t border-slate-100"><td className="p-3 font-bold">{student.displayName}</td><td className="p-3">{student.firstTry}</td><td className="p-3">{student.independent}</td><td className="p-3">{student.supported}</td><td className="p-3">{student.unresolved}</td><td className="p-3">{total(student.contributions.harvested) + total(student.contributions.deposited) + total(student.contributions.crafted)}</td></tr>)}</tbody></table></div>
          </section>
          <section><h3 className="mb-3 text-lg font-black text-slate-950">Questions to review</h3><div className="grid gap-2 sm:grid-cols-2">{report.questionDiagnostics.filter((item) => item.signal !== "clear").map((item) => <div key={`${item.bank}:${item.questionId}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="font-bold text-slate-900">{item.prompt}</p><p className="mt-1 text-xs font-semibold text-amber-900">{item.reasons.join(" · ")}</p></div>)}{report.questionDiagnostics.every((item) => item.signal === "clear") ? <p className="text-sm font-semibold text-slate-500">No question-level concerns have enough evidence yet.</p> : null}</div></section>
        </div> : null}
      </main>
    </div>
  );
}
