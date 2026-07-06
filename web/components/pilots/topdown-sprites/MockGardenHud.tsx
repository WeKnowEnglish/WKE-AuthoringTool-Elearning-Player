"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { MOCK_HUD } from "@/lib/topdown/preview-mock-data";

type Props = {
  spellEnabled?: boolean;
  className?: string;
};

export function MockGardenHud({ spellEnabled = true, className }: Props) {
  const letterEntries = Object.entries(MOCK_HUD.letters)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <KidPanel className={clsx("flex h-full min-h-0 flex-col p-2.5 sm:p-3", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xl sm:text-2xl" aria-hidden>
          🌱
        </span>
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-kid-ink/70 sm:text-xs">
            Seeds
          </p>
          <p className="text-base font-extrabold text-kid-ink sm:text-lg">
            {MOCK_HUD.seedCount}
          </p>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-kid-ink/70 sm:text-xs">
          Letters
        </p>
        {letterEntries.length > 0 ?
          <div className="mt-1.5 flex flex-wrap gap-1">
            {letterEntries.map(([ch, count]) => (
              <span
                key={ch}
                className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border-2 border-kid-ink bg-white px-1 py-0.5 text-xs font-extrabold text-kid-ink sm:min-w-[2rem] sm:text-sm"
              >
                {ch}
                {count > 1 ?
                  <span className="ml-0.5 text-[0.6rem] text-kid-ink/70">×{count}</span>
                : null}
              </span>
            ))}
          </div>
        : <p className="mt-1 text-xs font-semibold leading-snug text-kid-ink/60 sm:text-sm">
            Harvest crops to collect letters
          </p>
        }
      </div>

      <div className="mt-3 shrink-0 border-t-2 border-kid-ink/15 pt-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-kid-ink/70 sm:text-xs">
          Spelling · Level {MOCK_HUD.spellingLevel}
        </p>
        <p className="text-xs font-extrabold leading-snug text-kid-ink sm:text-sm">
          {MOCK_HUD.spellingTitle}{" "}
          <span className="font-semibold text-kid-ink/70">
            ({MOCK_HUD.spellingProgress})
          </span>
        </p>
      </div>

      <KidButton
        variant="secondary"
        className="!min-h-11 mt-3 w-full !min-w-0 shrink-0 !px-3 !py-2 !text-sm"
        disabled={!spellEnabled}
        aria-label="Spell a word (preview only)"
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>✏️</span>
          <span>Spell</span>
        </span>
      </KidButton>
    </KidPanel>
  );
}
