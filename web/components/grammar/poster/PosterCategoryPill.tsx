import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  label: string;
  emoji?: string;
  backgroundColor: string;
  variant?: GrammarPosterVariant;
};

export function PosterCategoryPill({ label, emoji, backgroundColor, variant = "poster" }: Props) {
  const isShowcase = variant === "showcase";

  return (
    <div
      className={
        isShowcase ?
          "mb-4 flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-4 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
        : "mb-2 flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-4 py-2 text-center text-base font-bold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
      }
      style={{ backgroundColor }}
    >
      {emoji ? (
        <span className={isShowcase ? "text-lg" : "text-2xl"} aria-hidden>
          {emoji}
        </span>
      ) : null}
      <span>{label}</span>
    </div>
  );
}
