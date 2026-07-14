import Link from "next/link";
import type { LiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";

type Props = {
  classId: string;
  archived: boolean;
  overview: LiveGameClassProjectOverview;
};

const END_REASON_LABELS = {
  objective_completed: "Team escaped",
  timeout: "Time expired",
  host_ended_early: "Ended by teacher",
} as const;

function formatPlayedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LiveGameClassProjectPanel({ classId, archived, overview }: Props) {
  const progress = overview.project?.progress;

  return (
    <section className="space-y-3 rounded border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live Game project</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Class games build a shared history of practice. Each completed round records the
            learning target and contributes once to this class project.
          </p>
        </div>
        {!archived ? (
          <Link
            href={`/live-game/host?classId=${encodeURIComponent(classId)}`}
            className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Host a class game
          </Link>
        ) : null}
      </div>

      {progress ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded bg-blue-50 p-3">
              <div className="text-2xl font-bold text-blue-950">{progress.roundsPlayed}</div>
              <div className="text-sm text-blue-900">completed rounds</div>
            </div>
            <div className="rounded bg-emerald-50 p-3">
              <div className="text-2xl font-bold text-emerald-950">{progress.teamEscapes}</div>
              <div className="text-sm text-emerald-900">team escapes</div>
            </div>
            <div className="rounded bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-950">Latest learning target</div>
              <div className="mt-1 text-sm text-amber-900">
                {progress.lastLearningObjective ?? "No target recorded yet"}
              </div>
            </div>
          </div>

          {overview.recentRounds.length ? (
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Recent rounds</h3>
              <ul className="mt-2 divide-y rounded border">
                {overview.recentRounds.map((round) => (
                  <li key={round.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-neutral-900">{round.questionSetTitle}</div>
                      <div className="text-neutral-600">{round.learningObjective}</div>
                    </div>
                    <div className="text-right text-neutral-600">
                      <div>{END_REASON_LABELS[round.endReason]}</div>
                      <div className="text-xs">{formatPlayedAt(round.endedAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded border border-dashed bg-neutral-50 px-4 py-5 text-sm text-neutral-700">
          No class game has been completed yet. Choose this class when you host a Live Game to
          start its shared project history.
        </div>
      )}
    </section>
  );
}
