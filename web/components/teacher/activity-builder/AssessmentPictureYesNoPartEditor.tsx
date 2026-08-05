"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import type { AssessmentPart } from "@/lib/assessment/types";

type PictureYesNoPart = Extract<AssessmentPart, { kind: "picture_yes_no" }>;

type Props = {
  part: PictureYesNoPart;
  onChange: (next: PictureYesNoPart) => void;
};

function emptyStatement(): PictureYesNoPart["activity"]["statements"][number] {
  return {
    id: `pyn-${crypto.randomUUID().slice(0, 8)}`,
    text: "New statement",
    correctAnswer: "yes",
  };
}

export function AssessmentPictureYesNoPartEditor({ part, onChange }: Props) {
  const statements = part.activity.statements;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(
    statements.length,
    part.id,
  );
  const statement = statements[itemIndex];

  const patchActivity = (
    updater: (
      activity: PictureYesNoPart["activity"],
    ) => PictureYesNoPart["activity"],
  ) => {
    onChange({ ...part, activity: updater(part.activity) });
  };

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={statements.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Statement"
        itemLabels={statements.map((row) => row.text.trim() || "Statement")}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            statements: [...activity.statements, emptyStatement()],
          }));
          setItemIndex(statements.length);
        }}
        onRemove={() => {
          if (statements.length <= 1 || !statement) return;
          patchActivity((activity) => ({
            ...activity,
            statements: activity.statements.filter(
              (row) => row.id !== statement.id,
            ),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {statement ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Statement
              <textarea
                value={statement.text}
                onChange={(event) => {
                  const text = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    statements: activity.statements.map((row) =>
                      row.id === statement.id ? { ...row, text } : row,
                    ),
                  }));
                }}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
            <fieldset>
              <legend className="text-[11px] font-bold text-stone-700">
                Correct answer
              </legend>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {(["yes", "no"] as const).map((choice) => (
                  <label
                    key={choice}
                    className={`flex min-h-9 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold capitalize ${
                      statement.correctAnswer === choice
                        ? "border-violet-700 bg-violet-50 text-violet-950"
                        : "border-stone-200 bg-white text-stone-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pyn-${statement.id}`}
                      className="sr-only"
                      checked={statement.correctAnswer === choice}
                      onChange={() =>
                        patchActivity((activity) => ({
                          ...activity,
                          statements: activity.statements.map((row) =>
                            row.id === statement.id
                              ? { ...row, correctAnswer: choice }
                              : row,
                          ),
                        }))
                      }
                    />
                    {choice}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Picture" defaultOpen={false}>
        <MediaUrlControls
          label="Picture"
          value={part.activity.image.src}
          compact
          onChange={(url) =>
            patchActivity((activity) => ({
              ...activity,
              image: { ...activity.image, src: url },
            }))
          }
        />
        <label className="block text-[11px] font-bold text-stone-700">
          Image alt text
          <input
            value={part.activity.image.alt}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                image: { ...activity.image, alt: event.target.value },
              }))
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>
      </AssessmentInspectorSection>
    </div>
  );
}
