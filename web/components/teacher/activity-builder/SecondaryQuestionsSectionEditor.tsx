"use client";

import {
  parseSecondaryQuestionsAuthoringSection,
  secondaryQuestionsSectionValidationIssues,
  type SecondaryQuestionsSection,
} from "@/lib/homework-templates/secondary-homework-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function splitChoices(value: string): string[] {
  return value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyItem(): SecondaryQuestionsSection["items"][number] {
  return {
    id: `question-${crypto.randomUUID().slice(0, 8)}`,
    before: "Where",
    choices: ["did", "were"],
    after: "you go after school?",
    answer: "did",
  };
}

export function SecondaryQuestionsSectionEditor({ section, onChange }: Props) {
  const parsed = parseSecondaryQuestionsAuthoringSection(section);
  const issues = secondaryQuestionsSectionValidationIssues(section);
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(
    parsed?.items.length ?? 0,
    parsed?.partId,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This questions section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: SecondaryQuestionsSection) => SecondaryQuestionsSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const item = parsed.items[itemIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Past-question choices
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit one question at a time. Answer must be one of the choices.
        </p>
      </div>

      <AuthoringItemPager
        count={parsed.items.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Question"
        minCount={1}
        maxCount={20}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            items: [...prev.items, emptyItem()],
          }));
          setItemIndex(parsed.items.length);
        }}
        onRemove={() => {
          if (!item) return;
          patch((prev) => ({
            ...prev,
            items: prev.items.filter((row) => row.id !== item.id),
          }));
        }}
      >
        {item ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Before blank
              <input
                value={item.before}
                onChange={(event) => {
                  const before = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) =>
                      index === itemIndex ? { ...row, before } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Choices (comma-separated)
              <input
                value={item.choices.join(", ")}
                onChange={(event) => {
                  const choices = splitChoices(event.target.value);
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) => {
                      if (index !== itemIndex) return row;
                      const answer = choices.includes(row.answer)
                        ? row.answer
                        : (choices[0] ?? "");
                      return { ...row, choices, answer };
                    }),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              After blank
              <input
                value={item.after}
                onChange={(event) => {
                  const after = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) =>
                      index === itemIndex ? { ...row, after } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Correct choice
              <select
                value={item.answer}
                onChange={(event) => {
                  const answer = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) =>
                      index === itemIndex ? { ...row, answer } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              >
                {item.choices.length === 0 ? (
                  <option value="">Add at least two choices</option>
                ) : null}
                {item.choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
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
