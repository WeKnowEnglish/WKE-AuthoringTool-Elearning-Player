import { formatSecondarySyllableHint } from "@/lib/secondary/secondary-learn-content";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
};

export function SecondaryWordMemoryTipCard({ item }: Props) {
  const support = item.spellingSupport;
  if (!support) return null;

  const syllableHint = formatSecondarySyllableHint(support.syllables);
  const mistakes = support.commonMistakes;
  if (!syllableHint && mistakes.length === 0) return null;

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className="text-sm font-extrabold text-kid-ink">Remember the word</h3>
      {syllableHint ? (
        <p className="mt-2 font-mono text-lg font-extrabold tracking-wide text-kid-ink">{syllableHint}</p>
      ) : null}
      {mistakes.length > 0 ? (
        <p className="mt-2 text-xs font-semibold text-kid-ink/75">
          Common mistake{mistakes.length > 1 ? "s" : ""}:{" "}
          <span className="font-extrabold text-amber-900">{mistakes.join(", ")}</span>
        </p>
      ) : null}
    </section>
  );
}
