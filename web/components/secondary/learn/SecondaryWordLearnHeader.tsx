import type { SecondaryPartOfSpeech } from "@/lib/secondary/types";
import { SecondaryWordProgressBadge } from "@/components/secondary/learn/SecondaryWordProgressBadge";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";

type Props = {
  word: string;
  partOfSpeech: SecondaryPartOfSpeech;
  topicTitle: string;
  snapshot: SecondaryWordDisplaySnapshot;
  isFocus?: boolean;
  descriptionId?: string;
};

export function SecondaryWordLearnHeader({
  word,
  partOfSpeech,
  topicTitle,
  snapshot,
  isFocus,
  descriptionId,
}: Props) {
  return (
    <header className="space-y-2">
      <p className="text-2xl font-extrabold text-kid-ink">{word}</p>
      <p
        className="text-sm font-semibold text-kid-ink/70"
        id={descriptionId}
      >
        {partOfSpeech} · {topicTitle}
      </p>
      <SecondaryWordProgressBadge snapshot={snapshot} isFocus={isFocus} />
    </header>
  );
}
