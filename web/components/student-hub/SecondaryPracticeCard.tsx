"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import type { LearningBand } from "@/lib/learning-band";

type Props = {
  muted: boolean;
  learningBand: LearningBand | null;
  className?: string;
};

const cardClass =
  "w-full rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 text-left transition-transform [touch-action:manipulation] sm:p-4";

export function SecondaryPracticeCard({ muted, learningBand, className }: Props) {
  const eligible = isSecondaryEligibleBand(learningBand);

  if (eligible) {
    return (
      <Link
        href="/secondary"
        className={clsx(cardClass, "flex items-center gap-4 hover:bg-kid-surface-muted active:scale-[0.98]", className)}
        onClick={() => playSfx("tap", muted)}
      >
        <span className="text-5xl leading-none" aria-hidden>
          📚
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-lg font-bold text-kid-ink">Secondary vocabulary</p>
          <p className="mt-1 text-sm font-semibold text-kid-ink/75">
            Today&apos;s practice — Match, Cloze, then Spelling.
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div
      className={clsx(cardClass, "flex cursor-not-allowed items-center gap-4 opacity-55 grayscale", className)}
      aria-disabled="true"
    >
      <span className="text-5xl leading-none" aria-hidden>
        📚
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-lg font-bold text-kid-ink">Secondary vocabulary</p>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          Available on the Secondary path. Primary practice stays in Learn below.
        </p>
      </div>
    </div>
  );
}

export function SecondaryAccessNotice({ message }: { message: string | null | undefined }) {
  if (message !== "secondary_for_a2" && message !== "secondary_path_only") return null;

  return (
    <KidPanel className="mx-3 mt-2 shrink-0 border-amber-800 bg-amber-50 p-3 text-center">
      <p className="text-sm font-bold text-amber-950" role="status" aria-live="polite">
        Secondary vocabulary practice is for the Secondary path. Keep learning in your home and
        Learn rooms.
      </p>
    </KidPanel>
  );
}
