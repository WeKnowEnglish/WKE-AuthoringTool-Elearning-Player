"use client";

import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import { splitAssessmentCsv } from "@/lib/activity-tracks/patch-assessment-part";
import type { AssessmentPart } from "@/lib/assessment/types";
import type { ClozeOpenSegment } from "@/lib/cloze-open";

type ClozeOpenPart = Extract<AssessmentPart, { kind: "cloze_open" }>;

type Props = {
  part: ClozeOpenPart;
  onChange: (next: ClozeOpenPart) => void;
};

function emptyTextSegment(): ClozeOpenSegment {
  return {
    type: "text",
    id: `ot-${crypto.randomUUID().slice(0, 8)}`,
    text: "…",
  };
}

function emptyGapSegment(): ClozeOpenSegment {
  return {
    type: "gap",
    id: `og-${crypto.randomUUID().slice(0, 8)}`,
    correctAnswers: ["answer"],
  };
}

export function AssessmentClozeOpenPartEditor({ part, onChange }: Props) {
  const {
    segments,
    passageTitle,
    caseSensitive,
    punctuationSensitive,
  } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(segments.length, part.id);
  const segment = segments[itemIndex];

  const patchActivity = (
    updater: (activity: ClozeOpenPart["activity"]) => ClozeOpenPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={segments.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Segment"
        itemLabels={segments.map((row) =>
          row.type === "text"
            ? row.text.trim() || "Text"
            : row.correctAnswers[0]?.trim() || "Gap",
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
                  Accepted answers (comma or new line)
                  <textarea
                    value={segment.correctAnswers.join(", ")}
                    onChange={(event) => {
                      const correctAnswers = splitAssessmentCsv(event.target.value);
                      patchActivity((activity) => ({
                        ...activity,
                        segments: activity.segments.map((row) =>
                          row.id === segment.id && row.type === "gap"
                            ? {
                                ...row,
                                correctAnswers:
                                  correctAnswers.length > 0
                                    ? correctAnswers
                                    : [""],
                              }
                            : row,
                        ),
                      }));
                    }}
                    rows={2}
                    className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
                  />
                </label>
                <label className="block text-[11px] font-bold text-stone-700">
                  Hint (optional)
                  <input
                    value={segment.hint ?? ""}
                    onChange={(event) => {
                      const hint = event.target.value.trim() || undefined;
                      patchActivity((activity) => ({
                        ...activity,
                        segments: activity.segments.map((row) =>
                          row.id === segment.id && row.type === "gap"
                            ? { ...row, hint }
                            : row,
                        ),
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                  />
                </label>
              </>
            )}
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Passage options" defaultOpen={false}>
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
            checked={caseSensitive}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                caseSensitive: event.target.checked,
              }))
            }
            className="h-4 w-4 accent-violet-700"
          />
          Case sensitive
        </label>
        <label className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
          <input
            type="checkbox"
            checked={punctuationSensitive}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                punctuationSensitive: event.target.checked,
              }))
            }
            className="h-4 w-4 accent-violet-700"
          />
          Punctuation sensitive
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
      </AssessmentInspectorSection>
    </div>
  );
}
