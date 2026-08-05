"use client";

import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import type { AssessmentPart } from "@/lib/assessment/types";

type DefinitionMatchPart = Extract<AssessmentPart, { kind: "definition_match" }>;

type Props = {
  part: DefinitionMatchPart;
  onChange: (next: DefinitionMatchPart) => void;
};

function emptyPair(): DefinitionMatchPart["activity"]["pairs"][number] {
  return {
    id: `def-${crypto.randomUUID().slice(0, 8)}`,
    word: "word",
    definition: "Meaning goes here.",
  };
}

function emptyExtra(): NonNullable<DefinitionMatchPart["extraWords"]>[number] {
  return {
    id: `extra-${crypto.randomUUID().slice(0, 8)}`,
    word: "extra",
  };
}

export function AssessmentDefinitionMatchPartEditor({
  part,
  onChange,
}: Props) {
  const pairs = part.activity.pairs;
  const extras = part.extraWords ?? [];
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(pairs.length, part.id);
  const pair = pairs[itemIndex];

  const patch = (next: DefinitionMatchPart) => onChange(next);

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={pairs.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Pair"
        itemLabels={pairs.map((row) => row.word.trim() || "Pair")}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patch({
            ...part,
            activity: {
              ...part.activity,
              pairs: [...part.activity.pairs, emptyPair()],
            },
          });
          setItemIndex(pairs.length);
        }}
        onRemove={() => {
          if (pairs.length <= 1 || !pair) return;
          patch({
            ...part,
            activity: {
              ...part.activity,
              pairs: part.activity.pairs.filter((row) => row.id !== pair.id),
            },
          });
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {pair ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Word
              <input
                value={pair.word}
                onChange={(event) => {
                  const word = event.target.value;
                  patch({
                    ...part,
                    activity: {
                      ...part.activity,
                      pairs: part.activity.pairs.map((row) =>
                        row.id === pair.id ? { ...row, word } : row,
                      ),
                    },
                  });
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Definition
              <textarea
                value={pair.definition}
                onChange={(event) => {
                  const definition = event.target.value;
                  patch({
                    ...part,
                    activity: {
                      ...part.activity,
                      pairs: part.activity.pairs.map((row) =>
                        row.id === pair.id ? { ...row, definition } : row,
                      ),
                    },
                  });
                }}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Word bank options" defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-stone-700">Extra words</p>
            <button
              type="button"
              onClick={() =>
                patch({
                  ...part,
                  extraWords: [...extras, emptyExtra()],
                })
              }
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
            >
              Add
            </button>
          </div>
          {extras.length === 0 ? (
            <p className="text-[11px] font-semibold text-stone-500">
              No distractors yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {extras.map((extra) => (
                <li key={extra.id} className="flex items-center gap-1.5">
                  <input
                    value={extra.word}
                    onChange={(event) => {
                      const word = event.target.value;
                      patch({
                        ...part,
                        extraWords: extras.map((row) =>
                          row.id === extra.id ? { ...row, word } : row,
                        ),
                      });
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                    aria-label="Extra word"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        ...part,
                        extraWords: extras.filter((row) => row.id !== extra.id),
                      })
                    }
                    className="shrink-0 rounded-md border border-red-200 px-2 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
          <input
            type="checkbox"
            checked={part.activity.shuffleWords}
            onChange={(event) =>
              patch({
                ...part,
                activity: {
                  ...part.activity,
                  shuffleWords: event.target.checked,
                },
              })
            }
            className="h-4 w-4 accent-violet-700"
          />
          Shuffle word bank for students
        </label>
      </AssessmentInspectorSection>
    </div>
  );
}
