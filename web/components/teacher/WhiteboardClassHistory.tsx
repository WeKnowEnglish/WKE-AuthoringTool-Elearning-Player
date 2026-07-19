import Link from "next/link";
import type { WhiteboardRoundHistoryItem } from "@/lib/whiteboard/server/history";

type Props = {
  classId: string;
  rounds: WhiteboardRoundHistoryItem[];
};

export function WhiteboardClassHistory({ classId, rounds }: Props) {
  if (rounds.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Whiteboard history</h2>
        <p className="mt-1 text-sm text-slate-600">
          Past class rounds will show here after you start a whiteboard.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Whiteboard history</h2>
        <p className="text-sm text-slate-600">
          Review archived or ended rounds for this class ({classId.slice(0, 8)}…).
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {rounds.map((round) => (
          <li key={round.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-semibold text-slate-900">{round.title}</p>
              <p className="text-xs text-slate-500">
                Code {round.joinCode} · {round.phase} · {round.submissionCount} submission
                {round.submissionCount === 1 ? "" : "s"}
                {round.archivedAt ? " · archived" : ""}
              </p>
            </div>
            <Link
              href={`/teacher/whiteboard/review/${encodeURIComponent(round.id)}`}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            >
              Review
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
