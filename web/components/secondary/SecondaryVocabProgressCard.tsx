"use client";

type Props = {
  masteredCount: number;
  totalCount: number;
};

function encouragementMessage(masteredCount: number, totalCount: number): string {
  if (totalCount <= 0) return "Check back when today's words are ready.";
  if (masteredCount <= 0) return "Let's learn today's words.";
  const percent = Math.round((masteredCount / totalCount) * 100);
  if (percent >= 100) {
    return "All of today's words are strong. Come back tomorrow for a fresh set.";
  }
  if (percent >= 50) return "More than halfway — nice work.";
  return "Good start — keep building.";
}

export function SecondaryVocabProgressCard({ masteredCount, totalCount }: Props) {
  const buildingCount = Math.max(0, totalCount - masteredCount);
  const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
  const fillWidth = totalCount > 0 ? Math.min(100, (masteredCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl border-2 border-kid-ink bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold text-kid-ink">Today&apos;s vocabulary</p>
        <p className="text-lg font-extrabold tabular-nums text-kid-ink">
          {masteredCount}/{totalCount}
        </p>
      </div>

      <div
        className="mt-3 h-4 overflow-hidden rounded-full border-2 border-kid-ink bg-kid-panel"
        role="meter"
        aria-label="Today's vocabulary progress"
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-valuenow={masteredCount}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            percent >= 50 ? "bg-emerald-400" : "bg-kid-accent"
          }`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>

      <p className="mt-2 text-xs font-semibold text-kid-ink/75">
        {masteredCount} word{masteredCount === 1 ? "" : "s"} mastered · {buildingCount} still
        building
      </p>
      <p className="mt-1 text-sm font-extrabold text-kid-ink">
        {encouragementMessage(masteredCount, totalCount)}
      </p>
    </div>
  );
}
