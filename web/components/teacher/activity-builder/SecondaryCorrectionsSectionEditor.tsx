"use client";

import {
  parseSecondaryCorrectionsAuthoringSection,
  secondaryCorrectionsSectionValidationIssues,
  type SecondaryCorrectionsSection,
} from "@/lib/homework-templates/secondary-homework-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function emptyQuestion(): SecondaryCorrectionsSection["questions"][number] {
  return {
    id: `correction-${crypto.randomUUID().slice(0, 8)}`,
    sentence: "They go to the park yesterday.",
    answer: "went",
  };
}

export function SecondaryCorrectionsSectionEditor({ section, onChange }: Props) {
  const parsed = parseSecondaryCorrectionsAuthoringSection(section);
  const issues = secondaryCorrectionsSectionValidationIssues(section);
  const [questionIndex, setQuestionIndex] = useAuthoringItemIndex(
    parsed?.questions.length ?? 0,
    parsed?.partId,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This corrections section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: SecondaryCorrectionsSection) => SecondaryCorrectionsSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const question = parsed.questions[questionIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Corrections content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit one sentence at a time (max 20).
        </p>
      </div>

      <AuthoringItemPager
        count={parsed.questions.length}
        index={questionIndex}
        onIndexChange={setQuestionIndex}
        label="Question"
        minCount={1}
        maxCount={20}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            questions: [...prev.questions, emptyQuestion()],
          }));
          setQuestionIndex(parsed.questions.length);
        }}
        onRemove={() => {
          if (!question) return;
          patch((prev) => ({
            ...prev,
            questions: prev.questions.filter((item) => item.id !== question.id),
          }));
        }}
      >
        {question ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Sentence with mistake
              <textarea
                value={question.sentence}
                rows={2}
                onChange={(event) => {
                  const sentence = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    questions: prev.questions.map((item, index) =>
                      index === questionIndex ? { ...item, sentence } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Correct verb / answer
              <input
                value={question.answer}
                onChange={(event) => {
                  const answer = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    questions: prev.questions.map((item, index) =>
                      index === questionIndex ? { ...item, answer } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
          </div>
        ) : null}
      </AuthoringItemPager>

      {issues.length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-800">
          Keep editing — {issues[0]}
        </p>
      ) : null}
    </div>
  );
}
