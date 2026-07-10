import type { SecondaryPartOfSpeech } from "@/lib/secondary/types";
import { SecondaryWordIllustration } from "@/components/secondary/learn/SecondaryWordIllustration";
import { SecondaryWordProgressBadge } from "@/components/secondary/learn/SecondaryWordProgressBadge";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = {
  word: string;
  partOfSpeech: SecondaryPartOfSpeech;
  topicTitle: string;
  snapshot: SecondaryWordDisplaySnapshot;
  isFocus?: boolean;
  descriptionId?: string;
  imageUrl?: string | null;
  centered?: boolean;
  stacked?: boolean;
};

export function SecondaryWordLearnHeader({
  word,
  partOfSpeech,
  topicTitle,
  snapshot,
  isFocus,
  descriptionId,
  imageUrl,
  centered = false,
  stacked = false,
}: Props) {
  const hasImage = Boolean(imageUrl?.trim());

  if (stacked) {
    return (
      <header className="space-y-2">
        {hasImage ? (
          <SecondaryWordIllustration imageUrl={imageUrl} word={word} size="drawer" />
        ) : null}
        <p className={secondaryUi.wordLarge}>{word}</p>
        <p className={secondaryUi.bodyMuted} id={descriptionId}>
          {partOfSpeech} · {topicTitle}
        </p>
        <SecondaryWordProgressBadge snapshot={snapshot} isFocus={isFocus} />
      </header>
    );
  }

  if (centered) {
    return (
      <header className="space-y-2">
        {hasImage ? (
          <SecondaryWordIllustration
            imageUrl={imageUrl}
            word={word}
            size="drawer"
            className="mx-auto"
          />
        ) : null}
        <p className={secondaryUi.wordLarge}>{word}</p>
        <p className={secondaryUi.bodyMuted} id={descriptionId}>
          {partOfSpeech} · {topicTitle}
        </p>
        <SecondaryWordProgressBadge snapshot={snapshot} isFocus={isFocus} centered />
      </header>
    );
  }

  return (
    <header className="space-y-2">
      {hasImage ? (
        <div className="flex items-start gap-3">
          <SecondaryWordIllustration imageUrl={imageUrl} word={word} size="drawer" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className={secondaryUi.wordLarge}>{word}</p>
            <p className={`${secondaryUi.bodyMuted}`} id={descriptionId}>
              {partOfSpeech} · {topicTitle}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className={secondaryUi.wordLarge}>{word}</p>
          <p className={`${secondaryUi.bodyMuted}`} id={descriptionId}>
            {partOfSpeech} · {topicTitle}
          </p>
        </>
      )}
      <SecondaryWordProgressBadge snapshot={snapshot} isFocus={isFocus} />
    </header>
  );
}
