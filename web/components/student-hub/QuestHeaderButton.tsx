"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import { playSfx } from "@/lib/audio/sfx";
import { getDailyQuestUiRows } from "@/lib/teststartpage/daily-quests";

type Props = {
  muted: boolean;
  hydrated: boolean;
  dailyQuestUiKey: number;
  expanded: boolean;
  onClick: () => void;
};

export function QuestHeaderButton({ muted, hydrated, dailyQuestUiKey, expanded, onClick }: Props) {
  void dailyQuestUiKey;

  const summary = useMemo(() => {
    if (!hydrated) return null;
    const model = getDailyQuestUiRows();
    const done = model.rows.filter((r) => r.targetMet).length;
    const total = model.rows.length;
    const showBadge = done < total || model.chestOpenable;
    return { done, total, showBadge };
  }, [hydrated, dailyQuestUiKey]);

  return (
    <button
      type="button"
      className={clsx(
        "relative flex !min-h-9 shrink-0 items-center justify-center rounded-xl border-4 border-kid-ink px-3 py-1.5 text-xl transition-transform [touch-action:manipulation] active:scale-[0.96]",
        expanded ? "bg-[#0f4ecf] text-white shadow-[2px_2px_0_#0a2f86]" : "bg-kid-panel text-kid-ink hover:bg-kid-surface-muted",
      )}
      aria-expanded={expanded}
      aria-controls="daily-quests-menu"
      aria-label={
        summary ? `Daily quests, ${summary.done} of ${summary.total} complete` : "Daily quests"
      }
      onClick={() => {
        playSfx("tap", muted);
        onClick();
      }}
    >
      <span aria-hidden>📜</span>
      {summary?.showBadge ? (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-kid-ink bg-amber-400 px-1 text-[10px] font-extrabold tabular-nums text-kid-ink"
          aria-hidden
        >
          {summary.done < summary.total ? summary.total - summary.done : "!"}
        </span>
      ) : null}
    </button>
  );
}
