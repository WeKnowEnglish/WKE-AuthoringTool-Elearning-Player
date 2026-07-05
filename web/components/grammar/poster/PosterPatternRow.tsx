import type { PosterPattern } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  pattern: PosterPattern;
  variant?: GrammarPosterVariant;
};

export function PosterPatternRow({ pattern, variant = "poster" }: Props) {
  const isShowcase = variant === "showcase";

  return (
    <div className="rounded-xl border-2 border-kid-ink/20 bg-white/70 p-3 shadow-sm">
      <p
        className={
          isShowcase ?
            "mb-1 text-xs font-extrabold uppercase tracking-wide text-kid-ink/60"
          : "mb-1 text-sm font-extrabold uppercase tracking-wide text-kid-ink/60"
        }
      >
        {pattern.label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={
            isShowcase ?
              "flex-1 font-mono text-sm font-bold leading-snug text-kid-ink sm:text-base"
            : "flex-1 font-mono text-base font-bold leading-snug text-kid-ink"
          }
        >
          {pattern.formula}
        </p>
        <span className={isShowcase ? "text-2xl" : "text-3xl"} aria-hidden>
          {pattern.emoji}
        </span>
      </div>
    </div>
  );
}
