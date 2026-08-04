"use client";

import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import type { AssessmentPart } from "@/lib/assessment/types";
import type { ClozeChoiceSegment } from "@/lib/cloze-choice";

type ClozeChoicePart = Extract<AssessmentPart, { kind: "cloze_choice" }>;

type Props = {
  part: ClozeChoicePart;
  onChange: (next: ClozeChoicePart) => void;
};

function emptyTextSegment(): ClozeChoiceSegment {
  return {
    type: "text",
    id: `ct-${crypto.randomUUID().slice(0, 8)}`,
    text: "…",
  };
}

function emptyGapSegment(): ClozeChoiceSegment {
  return {
    type: "gap",
    id: `cg-${crypto.randomUUID().slice(0, 8)}`,
    options: ["option A", "option B", "option C"],
    correctAnswer: "option A",
  };
}

export function AssessmentClozeChoicePartEditor({ part, onChange }: Props) {
  const { segments, passageTitle, shuffleOptions } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(segments.length, part.id);
  const segment = segments[itemIndex];

  const patchActivity = (
    updater: (
      activity: ClozeChoicePart["activity"],
    ) => ClozeChoicePart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        Cloze choice
      </p>

      <label className="block text-[11px] font-bold text-stone-700">
        Passage title
        <input
          value={passageTitle ?? ""}
          onChange={(event) =>
            patchActivity((activity) => ({
              ...activity,
              passageTitle: event.target.value || undefined,
            }))
          }
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>

      <label className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
        <input
          type="checkbox"
          checked={shuffleOptions}
          onChange={(event) =>
            patchActivity((activity) => ({
              ...activity,
              shuffleOptions: event.target.checked,
            }))
          }
          className="h-4 w-4 accent-violet-700"
        />
        Shuffle options for students
      </label>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            patchActivity((activity) => ({
              ...activity,
              segments: [...activity.segments, emptyTextSegment()],
            }));
            setItemIndex(segments.length);
          }}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
        >
          Add text
        </button>
        <button
          type="button"
          onClick={() => {
            patchActivity((activity) => ({
              ...activity,
              segments: [...activity.segments, emptyGapSegment()],
            }));
            setItemIndex(segments.length);
          }}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
        >
          Add gap
        </button>
      </div>

      <AuthoringItemPager
        count={segments.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Segment"
        itemLabels={segments.map((row) =>
          row.type === "text"
            ? row.text.trim() || "Text"
            : row.correctAnswer.trim() || "Gap",
        )}
        minCount={1}
        onRemove={() => {
          if (segments.length <= 1 || !segment) return;
          patchActivity((activity) => ({
            ...activity,
            segments: activity.segments.filter((row) => row.id !== segment.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {segment ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
              {segment.type === "text" ? "Text" : "Gap"}
            </p>
            {segment.type === "text" ? (
              <label className="block text-[11px] font-bold text-stone-700">
                Text
                <textarea
                  value={segment.text}
                  onChange={(event) => {
                    const text = event.target.value;
                    patchActivity((activity) => ({
                      ...activity,
                      segments: activity.segments.map((row) =>
                        row.id === segment.id && row.type === "text"
                          ? { ...row, text }
                          : row,
                      ),
                    }));
                  }}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
                />
              </label>
            ) : (
              <>
                <label className="block text-[11px] font-bold text-stone-700">
                  Options (one per line, 2–4)
                  <textarea
                    value={segment.options.join("\n")}
                    onChange={(event) => {
                      const options = event.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .slice(0, 4);
                      const nextOptions =
                        options.length >= 2 ? options : [...options, "option"];
                      patchActivity((activity) => ({
                        ...activity,
                        segments: activity.segments.map((row) =>
                          row.id === segment.id && row.type === "gap"
                            ? {
                                ...row,
                                options: nextOptions,
                                correctAnswer: nextOptions.includes(row.correctAnswer)
                                  ? row.correctAnswer
                                  : (nextOptions[0] ?? ""),
                              }
                            : row,
                        ),
                      }));
                    }}
                    rows={4}
                    className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
                  />
                </label>
                <label className="block text-[11px] font-bold text-stone-700">
                  Correct answer
                  <select
                    value={segment.correctAnswer}
                    onChange={(event) => {
                      const correctAnswer = event.target.value;
                      patchActivity((activity) => ({
                        ...activity,
                        segments: activity.segments.map((row) =>
                          row.id === segment.id && row.type === "gap"
                            ? { ...row, correctAnswer }
                            : row,
                        ),
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                  >
                    {segment.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        ) : null}
      </AuthoringItemPager>
    </div>
  );
}
