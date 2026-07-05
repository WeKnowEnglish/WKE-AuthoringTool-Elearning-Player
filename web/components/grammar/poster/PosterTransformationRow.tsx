import type { PosterTransformationRow as PosterTransformationRowData } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  row: PosterTransformationRowData;
  variant?: GrammarPosterVariant;
};

export function PosterTransformationRow({ row, variant = "poster" }: Props) {
  const textClass =
    variant === "poster" ?
      "text-base font-bold text-kid-ink md:text-lg"
    : "text-sm font-bold text-kid-ink";

  return (
    <div className="mt-2 text-center">
      <p className={textClass}>
        {row.emoji ? (
          <span className="mr-1" aria-hidden>
            {row.emoji}
          </span>
        ) : null}
        {row.from}
        <span className="mx-1">{row.operator}</span>
        {row.suffix}
        <span className="mx-1">=</span>
        {row.to}
      </p>
      {row.ipa ? (
        <p className="mt-1 text-sm font-semibold text-kid-ink/70 md:text-base">{row.ipa}</p>
      ) : null}
    </div>
  );
}
