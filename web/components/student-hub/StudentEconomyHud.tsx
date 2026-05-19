"use client";

import { PlayerLevelBar } from "@/components/progress/PlayerLevelBar";

type Props = {
  gold: number;
  experience: number;
  /** Level bar is shown on the home room sidebar when false. */
  showLevelBar?: boolean;
};

export function StudentEconomyHud({ gold, experience, showLevelBar = true }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-kid-ink">
        <span aria-hidden>🪙</span>
        <span className="text-kid-ink/80">Gold</span>
        <span>{gold}</span>
      </div>
      {showLevelBar ? <PlayerLevelBar experience={experience} compact /> : null}
    </div>
  );
}
