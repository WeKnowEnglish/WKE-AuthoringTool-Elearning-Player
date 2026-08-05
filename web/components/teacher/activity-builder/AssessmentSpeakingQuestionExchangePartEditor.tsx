"use client";

import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import type { AssessmentPart } from "@/lib/assessment/types";

type QuestionExchangePart = Extract<
  AssessmentPart,
  { kind: "speaking_question_exchange" }
>;

type Props = {
  part: QuestionExchangePart;
  onChange: (next: QuestionExchangePart) => void;
};

function emptyCard(): QuestionExchangePart["activity"]["cards"][number] {
  return {
    id: `card-${crypto.randomUUID().slice(0, 8)}`,
    title: "New card",
    prompts: ["Where?", "When?"],
  };
}

export function AssessmentSpeakingQuestionExchangePartEditor({
  part,
  onChange,
}: Props) {
  const { prompt, maxDurationSeconds, cards } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(cards.length, part.id);
  const card = cards[itemIndex];

  const patchActivity = (
    updater: (
      activity: QuestionExchangePart["activity"],
    ) => QuestionExchangePart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={cards.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Card"
        itemLabels={cards.map((row) => row.title.trim() || "Card")}
        minCount={1}
        maxCount={6}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            cards: [...activity.cards, emptyCard()],
          }));
          setItemIndex(cards.length);
        }}
        onRemove={() => {
          if (cards.length <= 1 || !card) return;
          patchActivity((activity) => ({
            ...activity,
            cards: activity.cards.filter((row) => row.id !== card.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {card ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Card title
              <input
                value={card.title}
                onChange={(event) => {
                  const title = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    cards: activity.cards.map((row) =>
                      row.id === card.id ? { ...row, title } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Prompts (one per line)
              <textarea
                value={card.prompts.join("\n")}
                onChange={(event) => {
                  const prompts = event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);
                  patchActivity((activity) => ({
                    ...activity,
                    cards: activity.cards.map((row) =>
                      row.id === card.id
                        ? {
                            ...row,
                            prompts: prompts.length > 0 ? prompts : [""],
                          }
                        : row,
                    ),
                  }));
                }}
                rows={5}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Speaking setup" defaultOpen={false}>
        <label className="block text-[11px] font-bold text-stone-700">
          Student prompt
          <textarea
            value={prompt}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                prompt: event.target.value,
              }))
            }
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
          />
        </label>

        <label className="block text-[11px] font-bold text-stone-700">
          Max seconds
          <input
            type="number"
            min={15}
            max={600}
            value={maxDurationSeconds}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              patchActivity((activity) => ({
                ...activity,
                maxDurationSeconds: Math.round(next),
              }));
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>
      </AssessmentInspectorSection>
    </div>
  );
}
