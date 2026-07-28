import clsx from "clsx";
import { SecondaryWordIllustration } from "@/components/secondary/learn/SecondaryWordIllustration";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

type SectionProps = {
  title: string;
  wordItemIds: string[];
  selectionReasons: Record<string, string>;
  imageUrlsByWordId: Record<string, string | null>;
  selectedWordItemId: string | null;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
};

function WordSection({
  title,
  wordItemIds,
  selectionReasons,
  imageUrlsByWordId,
  selectedWordItemId,
  onWordSelect,
}: SectionProps) {
  if (wordItemIds.length === 0) return null;

  return (
    <section>
      <h3 className={secondaryUi.eyebrowMuted}>{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-2" role="list">
        {wordItemIds.map((wordItemId) => {
          const word = getSecondaryVocabItemById(wordItemId)?.word ?? wordItemId;
          const isNew = selectionReasons[wordItemId] === "new";
          const isSelected = selectedWordItemId === wordItemId;
          const imageUrl = imageUrlsByWordId[wordItemId] ?? null;

          return (
            <li key={wordItemId}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`View details for ${word}`}
                onClick={(event) => onWordSelect(wordItemId, event.currentTarget)}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-lg border-2 bg-sec-panel/50 px-3 py-2 text-left transition-[box-shadow,transform] duration-150 [touch-action:manipulation] hover:brightness-[0.98] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
                  secondaryUi.word,
                  isSelected
                    ? "border-sky-700 shadow-sm"
                    : "border-sec-ink/20 hover:border-sec-ink/35",
                )}
              >
                <SecondaryWordIllustration imageUrl={imageUrl} word={word} size="chip" />
                {word}
                {isNew ? (
                  <span
                    className={`rounded px-1.5 py-0.5 ${secondaryUi.tag} bg-sky-100 text-sky-800`}
                  >
                    New
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Props = {
  warmUpWordItemIds: string[];
  focusWordItemIds: string[];
  selectionReasons: Record<string, string>;
  imageUrlsByWordId: Record<string, string | null>;
  selectedWordItemId: string | null;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
};

export function SecondaryDailyWordIntroWordList({
  warmUpWordItemIds,
  focusWordItemIds,
  selectionReasons,
  imageUrlsByWordId,
  selectedWordItemId,
  onWordSelect,
}: Props) {
  return (
    <div className="space-y-4">
      <WordSection
        title={`Warm-up (${warmUpWordItemIds.length})`}
        wordItemIds={warmUpWordItemIds}
        selectionReasons={selectionReasons}
        imageUrlsByWordId={imageUrlsByWordId}
        selectedWordItemId={selectedWordItemId}
        onWordSelect={onWordSelect}
      />
      <WordSection
        title={`Focus (${focusWordItemIds.length})`}
        wordItemIds={focusWordItemIds}
        selectionReasons={selectionReasons}
        imageUrlsByWordId={imageUrlsByWordId}
        selectedWordItemId={selectedWordItemId}
        onWordSelect={onWordSelect}
      />
    </div>
  );
}
