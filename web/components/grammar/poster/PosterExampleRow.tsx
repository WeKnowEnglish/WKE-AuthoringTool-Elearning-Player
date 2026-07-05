import type { PosterExample } from "./poster-view-model";
import { isLabelOnlyText } from "@/lib/grammar-builder/poster-label";
import type { GrammarPosterVariant } from "./poster-variant";
type Props = {
  example: PosterExample;
  variant?: GrammarPosterVariant;
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

export function PosterExampleRow({ example, variant = "poster" }: Props) {
  const isShowcase = variant === "showcase";
  const isLabelOnly = isLabelOnlyText(example.sentence);

  if (isLabelOnly) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-1.5 text-center">
        <span
          className={isShowcase ? "text-3xl leading-none" : "text-5xl leading-none"}
          aria-hidden
        >
          {example.emoji}
        </span>
        <p
          className={
            isShowcase ?
              "text-xl font-extrabold tracking-wide text-kid-ink"
            : "text-2xl font-extrabold tracking-wide text-kid-ink"
          }
        >
          {example.sentence}
        </p>
        {example.label ? (
          <p className="text-sm font-semibold text-kid-ink/70">{example.label}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={
        isShowcase ?
          "flex items-center gap-2 border-b border-dashed border-kid-ink/25 py-2 last:border-b-0"
        : "flex items-center gap-3 border-b border-dashed border-kid-ink/25 py-2 last:border-b-0 sm:gap-4"
      }
    >
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div
          className={
            isShowcase ?
              "flex h-10 w-10 items-center justify-center rounded-lg border-2 border-kid-ink bg-white text-xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
            : "flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-4xl shadow-[2px_2px_0_0_var(--kid-shadow)]"
          }
          aria-hidden
        >
          {example.emoji}
        </div>
        {example.label ? (
          <span className="text-sm font-bold uppercase text-kid-ink/60">{example.label}</span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-start">
        <p
          className={
            isShowcase ?
              "text-xs font-semibold leading-snug text-kid-ink"
            : "text-lg font-semibold leading-snug text-kid-ink md:text-xl"
          }
        >
          {highlightSentence(example.sentence, example.highlight)}
        </p>
      </div>
    </div>
  );
}
