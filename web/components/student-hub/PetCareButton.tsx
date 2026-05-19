import { clsx } from "clsx";
import type { PetCareActionId } from "@/lib/pet/types";

const CARE_UI: Record<
  PetCareActionId,
  { label: string; emoji: string }
> = {
  feed: { label: "Feed", emoji: "🍎" },
  drink: { label: "Drink", emoji: "💧" },
  play: { label: "Play", emoji: "🎾" },
  wash: { label: "Wash", emoji: "🫧" },
  sleep: { label: "Bed", emoji: "🌙" },
  study: { label: "Study", emoji: "📚" },
};

type Props = {
  actionId: PetCareActionId;
  onClick: () => void;
  className?: string;
};

export function PetCareButton({ actionId, onClick, className }: Props) {
  const ui = CARE_UI[actionId];
  return (
    <button
      type="button"
      className={clsx(
        "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-xl border-4 border-kid-ink bg-kid-panel px-2 py-2 text-kid-ink shadow-[3px_3px_0_#0a2f86] transition-transform [touch-action:manipulation] active:scale-[0.98] hover:bg-kid-surface-muted",
        className,
      )}
      onClick={onClick}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {ui.emoji}
      </span>
      <span className="sr-only">{ui.label}</span>
    </button>
  );
}
