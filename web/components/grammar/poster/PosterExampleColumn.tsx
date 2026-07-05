import { PosterExampleRow } from "./PosterExampleRow";
import { PosterTransformationRow } from "./PosterTransformationRow";
import type { PosterExample } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  example: PosterExample;
  variant?: GrammarPosterVariant;
  showDivider?: boolean;
};

function highlightSentence(sentence: string, highlight?: string) {
  if (!highlight || !sentence.includes(highlight)) {
    return sentence;
  }
  const [before, after] = sentence.split(highlight);
  return (
    <>
      {before}
      <strong className="font-extrabold text-kid-ink">{highlight}</strong>
      {after}
    </>
  );
}

export function PosterExampleColumn({
  example,
  variant = "poster",
  showDivider = true,
}: Props) {
  const isShowcase = variant === "showcase";

  return (
    <div
      className={
        showDivider ?
          "border-b border-dashed border-kid-ink/25 pb-3 last:border-b-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3 last:sm:border-r-0"
        : "pb-3 sm:pb-0"
      }
    >
      {example.transformationRow ? (
        <PosterTransformationRow row={example.transformationRow} variant={variant} />
      ) : (
        <p
          className={
            isShowcase ?
              "text-xs font-semibold leading-snug text-kid-ink"
            : "text-base font-semibold leading-snug text-kid-ink md:text-lg"
          }
        >
          {highlightSentence(example.sentence, example.highlight)}
        </p>
      )}
      {!example.transformationRow ? (
        <div className="mt-2 flex flex-col items-center gap-1">
          <div
            className={
              isShowcase ?
                "flex h-12 w-12 items-center justify-center rounded-lg border-2 border-kid-ink bg-white text-2xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
              : "flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-4xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
            }
            aria-hidden
          >
            {example.emoji}
          </div>
          {example.label ? (
            <p className="text-sm font-semibold text-kid-ink/70">{example.label}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
