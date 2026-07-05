import type { PosterComparisonSide } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  left: PosterComparisonSide;
  right: PosterComparisonSide;
  variant?: GrammarPosterVariant;
};

function ComparisonColumn({
  side,
  variant,
  bordered,
}: {
  side: PosterComparisonSide;
  variant: GrammarPosterVariant;
  bordered?: boolean;
}) {
  const titleClass =
    variant === "poster" ?
      "mb-2 text-xs font-extrabold uppercase text-kid-ink md:text-sm"
    : "mb-2 text-xs font-extrabold uppercase text-kid-ink";
  const itemClass =
    variant === "poster" ?
      "text-base font-bold text-kid-ink md:text-lg"
    : "text-xs font-bold text-kid-ink";

  return (
    <div className={bordered ? "sm:border-r-2 sm:border-dashed sm:border-kid-ink/30 sm:pr-4" : "sm:pl-1"}>
      <p className={titleClass}>
        {side.badge ? (
          <span className="mr-1" aria-hidden>
            {side.badge}
          </span>
        ) : null}
        {side.title}
      </p>
      {side.items.map((item, i) => (
        <p key={i} className={itemClass}>
          {item.emoji ? (
            <span aria-hidden>{item.emoji} </span>
          ) : null}
          {item.sentence}
        </p>
      ))}
    </div>
  );
}

export function PosterComparisonBody({ left, right, variant = "poster" }: Props) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <ComparisonColumn side={left} variant={variant} bordered />
      <ComparisonColumn side={right} variant={variant} />
    </div>
  );
}
