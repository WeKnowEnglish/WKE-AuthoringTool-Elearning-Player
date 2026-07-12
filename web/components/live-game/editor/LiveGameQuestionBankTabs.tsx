"use client";

import { clsx } from "clsx";
import type { LiveGameQuestionBank } from "@/lib/live-game/question-banks/types";

const TABS: Array<{ id: LiveGameQuestionBank; label: string }> = [
  { id: "harvest", label: "Harvest" },
  { id: "deposit", label: "Deposit" },
  { id: "craft", label: "Craft" },
];

type Props = {
  active: LiveGameQuestionBank;
  counts: Record<LiveGameQuestionBank, number>;
  onChange: (bank: LiveGameQuestionBank) => void;
};

export function LiveGameQuestionBankTabs({ active, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx(
            "rounded-lg border-4 border-kid-ink px-4 py-2 text-sm font-extrabold",
            active === tab.id ? "bg-kid-panel text-kid-ink" : "bg-white text-kid-ink/80",
          )}
        >
          {tab.label} ({counts[tab.id]})
        </button>
      ))}
    </div>
  );
}
