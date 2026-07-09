import { buildSecondaryLearnClozePreview } from "@/lib/secondary/secondary-learn-content";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
};

export function SecondaryWordClozePreviewCard({ item }: Props) {
  const preview = buildSecondaryLearnClozePreview(item);
  if (!preview) return null;

  const parts = preview.split("____");

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className="text-sm font-extrabold text-kid-ink">Cloze</h3>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/90">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 ? (
              <span className="mx-0.5 inline-block min-w-[3.5rem] border-b-2 border-kid-ink font-extrabold text-kid-ink">
                {" "}
              </span>
            ) : null}
          </span>
        ))}
      </p>
    </section>
  );
}
