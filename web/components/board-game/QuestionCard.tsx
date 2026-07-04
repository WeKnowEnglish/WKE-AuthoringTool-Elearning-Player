import { KidPanel } from "@/components/kid-ui/KidPanel";
import { formatBlankSentence } from "@/lib/board-game/question-utils";
import type { Question } from "@/lib/board-game/types";

type Props = {
  question: Question | null;
  visible: boolean;
};

export function QuestionCard({ question, visible }: Props) {
  if (!visible || !question) {
    return (
      <KidPanel className="min-h-48">
        <h2 className="text-xl font-bold text-kid-ink">Question</h2>
        <p className="mt-4 text-lg text-kid-ink/70">
          Roll the dice to land on a space and draw a question.
        </p>
      </KidPanel>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <KidPanel className="min-h-48">
        <h2 className="text-xl font-bold text-kid-ink">Multiple Choice</h2>
        <p className="mt-4 text-2xl font-semibold leading-snug text-kid-ink">{question.prompt}</p>
        <ul className="mt-6 space-y-3">
          {question.options.map((option, index) => (
            <li
              key={`${question.id}-${option}`}
              className="rounded-lg border-4 border-kid-ink bg-kid-surface-muted px-4 py-3 text-lg font-semibold text-kid-ink"
            >
              {String.fromCharCode(65 + index)}. {option}
            </li>
          ))}
        </ul>
      </KidPanel>
    );
  }

  const { before, after } = formatBlankSentence(question.sentence);
  const hasBlank = /___|\[blank\]|____|\.\.\./.test(question.sentence);
  const isSpeakingChallenge = !hasBlank;

  return (
    <KidPanel className="min-h-48">
      <h2 className="text-xl font-bold text-kid-ink">
        {isSpeakingChallenge ? "Speaking Challenge" : "Fill in the Blank"}
      </h2>
      <p className="mt-4 text-2xl font-semibold leading-snug text-kid-ink">
        {isSpeakingChallenge ? (
          question.sentence
        ) : (
          <>
            {before}
            <span className="mx-2 inline-block min-w-24 border-b-4 border-kid-accent bg-kid-accent/20 px-2">
              &nbsp;
            </span>
            {after}
          </>
        )}
      </p>
    </KidPanel>
  );
}
