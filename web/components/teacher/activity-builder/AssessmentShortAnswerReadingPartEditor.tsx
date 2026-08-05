"use client";

import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import { splitAssessmentCsv } from "@/lib/activity-tracks/patch-assessment-part";
import type { AssessmentPart } from "@/lib/assessment/types";

type ShortAnswerReadingPart = Extract<
  AssessmentPart,
  { kind: "short_answer_reading" }
>;

type Props = {
  part: ShortAnswerReadingPart;
  onChange: (next: ShortAnswerReadingPart) => void;
};

function emptyQuestion(): ShortAnswerReadingPart["activity"]["questions"][number] {
  return {
    id: `sa-${crypto.randomUUID().slice(0, 8)}`,
    prompt: "New question",
    acceptedAnswers: ["answer"],
  };
}

export function AssessmentShortAnswerReadingPartEditor({
  part,
  onChange,
}: Props) {
  const questions = part.activity.questions;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(
    questions.length,
    part.id,
  );
  const question = questions[itemIndex];

  const patchActivity = (
    updater: (
      activity: ShortAnswerReadingPart["activity"],
    ) => ShortAnswerReadingPart["activity"],
  ) => {
    onChange({ ...part, activity: updater(part.activity) });
  };

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={questions.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Question"
        itemLabels={questions.map((row) => row.prompt.trim() || "Question")}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            questions: [...activity.questions, emptyQuestion()],
          }));
          setItemIndex(questions.length);
        }}
        onRemove={() => {
          if (questions.length <= 1 || !question) return;
          patchActivity((activity) => ({
            ...activity,
            questions: activity.questions.filter(
              (row) => row.id !== question.id,
            ),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {question ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Prompt
              <textarea
                value={question.prompt}
                onChange={(event) => {
                  const prompt = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    questions: activity.questions.map((row) =>
                      row.id === question.id ? { ...row, prompt } : row,
                    ),
                  }));
                }}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Accepted answers (comma or new line)
              <textarea
                value={question.acceptedAnswers.join(", ")}
                onChange={(event) => {
                  const acceptedAnswers = splitAssessmentCsv(event.target.value);
                  patchActivity((activity) => ({
                    ...activity,
                    questions: activity.questions.map((row) =>
                      row.id === question.id
                        ? {
                            ...row,
                            acceptedAnswers:
                              acceptedAnswers.length > 0
                                ? acceptedAnswers
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
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Reading passage" defaultOpen={false}>
        <label className="block text-[11px] font-bold text-stone-700">
          Passage title
          <input
            value={part.activity.passage.title ?? ""}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                passage: {
                  ...activity.passage,
                  title: event.target.value || undefined,
                },
              }))
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>
        <label className="block text-[11px] font-bold text-stone-700">
          Passage text
          <textarea
            value={part.activity.passage.text}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                passage: { ...activity.passage, text: event.target.value },
              }))
            }
            rows={6}
            className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
          />
        </label>
      </AssessmentInspectorSection>
    </div>
  );
}
