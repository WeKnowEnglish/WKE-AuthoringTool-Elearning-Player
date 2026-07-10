import type { MasteryState } from "@/lib/mastery/types";
import {
  formatMasteryStateLabel,
  masteryScoreBarClass,
  masteryScoreTone,
  rubricBadgeClass,
} from "@/lib/mastery/teacher-mastery-display";

export function MasteryScoreBar({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const tone = masteryScoreTone(score);
  return (
    <div className="flex min-w-[5rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full rounded-full ${masteryScoreBarClass(tone)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-neutral-700">{pct}%</span>
    </div>
  );
}

export function MasteryStateChip({ state }: { state: MasteryState }) {
  return (
    <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
      {formatMasteryStateLabel(state)}
    </span>
  );
}

export function SignalChip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      {label}
    </span>
  );
}

export function KpiStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-white px-4 py-3">
      <p className="text-2xl font-bold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-1 text-sm text-neutral-600">{label}</p>
    </div>
  );
}

export function RubricBadge({ levelId, label }: { levelId: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${rubricBadgeClass(levelId)}`}
    >
      {label}
    </span>
  );
}
