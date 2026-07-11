import {
  buildSecondaryLearnExampleLines,
  splitTextAroundWord,
} from "@/lib/secondary/secondary-learn-content";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
  centered?: boolean;
};

export function SecondaryWordExampleList({ item }: Props) {
  const lines = buildSecondaryLearnExampleLines(item);
  const patterns = item.usagePatterns ?? [];
  const confusions = item.confusions ?? [];
  const prompt = item.productionPrompts?.[0];
  if (lines.length === 0 && patterns.length === 0 && confusions.length === 0 && !prompt) return null;

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className={secondaryUi.cardTitle}>See how it works</h3>
      <ul className="mt-2 space-y-2">
        {lines.map((line, index) => (
          <li key={`${line.kind}-${index}`} className={secondaryUi.bodyLarge}>
            {line.kind === "sentence" ? (
              <div>
                {line.label ? (
                  <p className={`${secondaryUi.eyebrowMuted} mb-0.5`}>{line.label}</p>
                ) : null}
                <p>
                  {splitTextAroundWord(line.text, line.highlightWord).map((part, partIndex) =>
                    part.highlight ? (
                      <mark
                        key={partIndex}
                        className="rounded bg-amber-200/80 px-0.5 font-extrabold text-kid-ink not-italic"
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <span key={partIndex}>{part.text}</span>
                    ),
                  )}
                </p>
              </div>
            ) : (
              <span className="text-kid-ink/75">
                <span className="font-extrabold text-kid-ink/50" aria-hidden>
                  ·{" "}
                </span>
                {line.text}
              </span>
            )}
          </li>
        ))}
      </ul>

      {patterns.length > 0 ? (
        <div className="mt-4 border-t-2 border-kid-ink/10 pt-3">
          <h4 className={secondaryUi.eyebrow}>Useful patterns</h4>
          <ul className="mt-2 space-y-2">
            {patterns.map((pattern) => (
              <li key={pattern.id} className={secondaryUi.body}>
                <span className="font-extrabold text-kid-ink">{pattern.pattern}</span>
                <span className="block text-kid-ink/75">{pattern.example}</span>
                {pattern.note ? <span className={`block ${secondaryUi.caption}`}>{pattern.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {confusions.length > 0 || item.usageNote ? (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-3">
          <h4 className={secondaryUi.eyebrow}>Notice</h4>
          {item.usageNote ? <p className={`mt-1 ${secondaryUi.body}`}>{item.usageNote}</p> : null}
          {confusions.map((confusion) => (
            <div key={confusion.word} className="mt-2">
              <p className={secondaryUi.body}>
                <span className="font-extrabold text-kid-ink">{item.word} / {confusion.word}: </span>
                {confusion.distinction}
              </p>
              <p className={secondaryUi.caption}>{confusion.contrastExample}</p>
            </div>
          ))}
        </div>
      ) : null}

      {prompt ? (
        <div className="mt-4 rounded-lg border-2 border-sky-200 bg-sky-50 px-3 py-3">
          <h4 className={secondaryUi.eyebrow}>Your turn</h4>
          <p className={`mt-1 ${secondaryUi.bodyLarge}`}>{prompt.prompt}</p>
          {prompt.sentenceStarter ? (
            <p className={`mt-2 ${secondaryUi.body}`}>
              <span className="font-extrabold text-kid-ink">Start with: </span>{prompt.sentenceStarter}
            </p>
          ) : null}
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-extrabold text-sky-900">Show a model</summary>
            <p className={`mt-1 ${secondaryUi.body}`}>{prompt.modelAnswer}</p>
          </details>
        </div>
      ) : null}
    </section>
  );
}
