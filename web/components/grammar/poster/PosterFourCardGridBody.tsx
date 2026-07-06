import { getSectionPillColor } from "./poster-section-colors";
import type { PosterMiniCard } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  miniCards: PosterMiniCard[];
  variant?: GrammarPosterVariant;
};

export function PosterFourCardGridBody({ miniCards, variant = "poster" }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {miniCards.map((mini) => (
        <div
          key={mini.title}
          className="rounded-xl border-2 border-dashed border-kid-ink/35 bg-white/60 p-2 sm:p-3"
          style={{ backgroundColor: `${getSectionPillColor(mini.color, mini.palette)}55` }}
        >
          {mini.badge ? (
            <span className="mr-1 text-base" aria-hidden>
              {mini.badge}
            </span>
          ) : null}
          <p
            className={
              variant === "poster" ?
                "text-xs font-extrabold uppercase text-kid-ink md:text-sm"
              : "text-[11px] font-extrabold uppercase text-kid-ink"
            }
          >
            {mini.title}
          </p>
          <p
            className={
              variant === "poster" ?
                "mt-1 text-sm font-bold leading-tight text-kid-ink md:text-base"
              : "mt-1 text-[11px] font-bold leading-tight text-kid-ink"
            }
          >
            {mini.rule}
          </p>
          {mini.formula ? (
            <p className="mt-1 font-mono text-xs font-extrabold text-kid-ink md:text-sm">
              {mini.formula}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
