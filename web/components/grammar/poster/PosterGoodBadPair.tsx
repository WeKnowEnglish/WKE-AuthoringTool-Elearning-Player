import type { PosterGoodBadPair as PosterGoodBadPairData } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  pair: PosterGoodBadPairData;
  variant?: GrammarPosterVariant;
  accentColor?: string;
};

function highlightSentence(sentence: string, highlight?: string) {
  if (!highlight || !sentence.includes(highlight)) {
    return sentence;
  }
  const [before, after] = sentence.split(highlight);
  return (
    <>
      {before}
      <strong className="font-extrabold">{highlight}</strong>
      {after}
    </>
  );
}

export function PosterGoodBadPair({ pair, variant = "poster", accentColor = "#1d4ed8" }: Props) {
  const textClass =
    variant === "poster" ?
      "text-base font-semibold leading-relaxed md:text-lg"
    : "text-sm font-semibold leading-relaxed";

  return (
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border-2 border-dashed border-kid-ink/35 bg-white/60 p-3">
        <p className="mb-1 text-xs font-extrabold uppercase" style={{ color: accentColor }}>
          Good
        </p>
        <p className={textClass}>
          {pair.good.emoji ? (
            <span className="mr-1" aria-hidden>
              {pair.good.emoji}
            </span>
          ) : null}
          {highlightSentence(pair.good.sentence, pair.good.highlight)}
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-kid-ink/35 bg-white/60 p-3">
        <p className="mb-1 text-xs font-extrabold uppercase text-kid-ink/60">Bad</p>
        <p className={`${textClass} text-kid-ink/60 line-through`}>
          {pair.bad.emoji ? (
            <span className="mr-1 no-underline" aria-hidden>
              {pair.bad.emoji}
            </span>
          ) : null}
          {highlightSentence(pair.bad.sentence, pair.bad.highlight)}
        </p>
      </div>
    </div>
  );
}
