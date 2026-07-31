import { buildSecondaryLearnClozePreview } from "@/lib/secondary/secondary-learn-content";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
  centered?: boolean;
};

export function SecondaryWordClozePreviewCard({ item, centered: _centered = false }: Props) {
  const preview = buildSecondaryLearnClozePreview(item);
  if (!preview) return null;

  const parts = preview.split("____");

  return (
    <section className="rounded-xl border-2 border-sec-ink/20 bg-sec-panel/40 p-4">
      <h3 className={secondaryUi.cardTitle}>Cloze</h3>
      <p className={`mt-2 ${secondaryUi.bodyLarge}`}>
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 ? (
              <span className="mx-0.5 inline-block min-w-[3.5rem] border-b-2 border-sec-ink font-extrabold text-sec-ink">
                {" "}
              </span>
            ) : null}
          </span>
        ))}
      </p>
    </section>
  );
}
