import {
  buildSecondaryLearnExampleLines,
  splitTextAroundWord,
} from "@/lib/secondary/secondary-learn-content";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
};

export function SecondaryWordExampleList({ item }: Props) {
  const lines = buildSecondaryLearnExampleLines(item);
  if (lines.length === 0) return null;

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className="text-sm font-extrabold text-kid-ink">See it in a sentence</h3>
      <ul className="mt-2 space-y-2">
        {lines.map((line, index) => (
          <li
            key={`${line.kind}-${index}`}
            className="text-sm font-semibold leading-relaxed text-kid-ink/90"
          >
            {line.kind === "sentence" ? (
              <span>
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
              </span>
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
    </section>
  );
}
