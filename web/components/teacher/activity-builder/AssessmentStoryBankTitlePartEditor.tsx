"use client";

import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import type { AssessmentPart } from "@/lib/assessment/types";

type StoryBankTitlePart = Extract<AssessmentPart, { kind: "story_bank_title" }>;

type Props = {
  part: StoryBankTitlePart;
  onChange: (next: StoryBankTitlePart) => void;
};

function emptyWord(): StoryBankTitlePart["activity"]["words"][number] {
  return {
    id: `w-${crypto.randomUUID().slice(0, 8)}`,
    word: "word",
  };
}

function emptyTitleOption(): StoryBankTitlePart["activity"]["titleOptions"][number] {
  return {
    id: `title-${crypto.randomUUID().slice(0, 8)}`,
    text: "New title option",
  };
}

export function AssessmentStoryBankTitlePartEditor({ part, onChange }: Props) {
  const { storyTitle, words, segments, titleOptions, correctTitleId } =
    part.activity;
  const [segmentIndex, setSegmentIndex] = useAuthoringItemIndex(
    segments.length,
    `${part.id}-seg`,
  );
  const segment = segments[segmentIndex];

  const patchActivity = (
    updater: (
      activity: StoryBankTitlePart["activity"],
    ) => StoryBankTitlePart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={segments.length}
        index={segmentIndex}
        onIndexChange={setSegmentIndex}
        label="Segment"
        itemLabels={segments.map((row) => {
          if (row.type === "text") return row.text.trim() || "Text";
          const word = words.find((item) => item.id === row.correctWordId);
          return word?.word.trim() || "Gap";
        })}
      >
        {segment ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
              {segment.type === "text" ? "Text" : "Gap"}
            </p>
            {segment.type === "text" ? (
              <label className="block text-[11px] font-bold text-stone-700">
                Story text
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
              <label className="block text-[11px] font-bold text-stone-700">
                Correct word
                <select
                  value={segment.correctWordId}
                  onChange={(event) => {
                    const correctWordId = event.target.value;
                    patchActivity((activity) => ({
                      ...activity,
                      segments: activity.segments.map((row) =>
                        row.id === segment.id && row.type === "gap"
                          ? { ...row, correctWordId }
                          : row,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                >
                  <option value="">Choose…</option>
                  {words.map((word) => (
                    <option key={word.id} value={word.id}>
                      {word.word}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Story setup" defaultOpen={false}>
        <label className="block text-[11px] font-bold text-stone-700">
          Story heading
          <input
            value={storyTitle}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                storyTitle: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-stone-700">Word bank</p>
            <button
              type="button"
              onClick={() =>
                patchActivity((activity) => ({
                  ...activity,
                  words: [...activity.words, emptyWord()],
                }))
              }
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {words.map((word) => (
              <li key={word.id} className="flex items-center gap-1.5">
                <input
                  value={word.word}
                  onChange={(event) => {
                    const nextWord = event.target.value;
                    patchActivity((activity) => ({
                      ...activity,
                      words: activity.words.map((row) =>
                        row.id === word.id ? { ...row, word: nextWord } : row,
                      ),
                    }));
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                  aria-label="Bank word"
                />
                <button
                  type="button"
                  disabled={words.length <= 2}
                  onClick={() =>
                    patchActivity((activity) => {
                      const nextWords = activity.words.filter(
                        (row) => row.id !== word.id,
                      );
                      const fallbackId = nextWords[0]?.id ?? "";
                      return {
                        ...activity,
                        words: nextWords,
                        segments: activity.segments.map((segment) =>
                          segment.type === "gap" &&
                          segment.correctWordId === word.id
                            ? { ...segment, correctWordId: fallbackId }
                            : segment,
                        ),
                      };
                    })
                  }
                  className="shrink-0 rounded-md border border-red-200 px-2 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-35"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </AssessmentInspectorSection>

      <AssessmentInspectorSection title="Title options" defaultOpen={false}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-stone-700">Title options</p>
          <button
            type="button"
            onClick={() =>
              patchActivity((activity) => ({
                ...activity,
                titleOptions: [...activity.titleOptions, emptyTitleOption()],
              }))
            }
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {titleOptions.map((option) => (
            <li key={option.id} className="flex items-start gap-1.5">
              <input
                type="radio"
                name={`story-title-${part.id}`}
                checked={correctTitleId === option.id}
                onChange={() =>
                  patchActivity((activity) => ({
                    ...activity,
                    correctTitleId: option.id,
                  }))
                }
                className="mt-2 h-4 w-4 accent-violet-700"
                aria-label="Mark as correct title"
              />
              <textarea
                value={option.text}
                onChange={(event) => {
                  const text = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    titleOptions: activity.titleOptions.map((row) =>
                      row.id === option.id ? { ...row, text } : row,
                    ),
                  }));
                }}
                rows={2}
                className="min-w-0 flex-1 resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
              <button
                type="button"
                disabled={titleOptions.length <= 2}
                onClick={() =>
                  patchActivity((activity) => ({
                    ...activity,
                    titleOptions: activity.titleOptions.filter(
                      (row) => row.id !== option.id,
                    ),
                    correctTitleId:
                      activity.correctTitleId === option.id
                        ? (activity.titleOptions.find((row) => row.id !== option.id)
                            ?.id ?? "")
                        : activity.correctTitleId,
                  }))
                }
                className="mt-1 shrink-0 rounded-md border border-red-200 px-2 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-35"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[10px] font-semibold text-stone-500">
          Selected radio = correct title for scoring.
        </p>
      </AssessmentInspectorSection>
    </div>
  );
}
