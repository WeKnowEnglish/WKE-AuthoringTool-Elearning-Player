"use client";

import {
  parseQuestionWritingSection,
  questionWritingSectionValidationIssues,
  type QuestionWritingSection,
} from "@/lib/homework-templates/homework-template-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function splitCsv(value: string): string[] {
  return value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyPrompt(): QuestionWritingSection["prompts"][number] {
  return {
    id: `question-${crypto.randomUUID().slice(0, 8)}`,
    promptWords: ["visit", "a museum?"],
    requiredWords: ["visited", "museum"],
    questionWord: "Have",
    helpingVerbs: ["have"],
    minWords: 6,
    modelQuestion: "Have you ever visited a museum?",
  };
}

export function QuestionWritingSectionEditor({ section, onChange }: Props) {
  const parsed = parseQuestionWritingSection(section);
  const issues = questionWritingSectionValidationIssues(section);
  const [promptIndex, setPromptIndex] = useAuthoringItemIndex(
    parsed?.prompts.length ?? 0,
    parsed?.id,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This question writing section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: QuestionWritingSection) => QuestionWritingSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const prompt = parsed.prompts[promptIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Question writing content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit the worked example, then one writing prompt at a time (min 3, max 8).
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-2.5 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Worked example
        </p>
        {(
          [
            ["prompt", "Prompt"],
            ["question", "Model question"],
            ["answer", "Model answer"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-[11px] font-bold text-stone-700">
            {label}
            <input
              value={parsed.workedExample[key]}
              onChange={(event) => {
                const value = event.target.value;
                patch((prev) => ({
                  ...prev,
                  workedExample: { ...prev.workedExample, [key]: value },
                }));
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
            />
          </label>
        ))}
      </div>

      <AuthoringItemPager
        count={parsed.prompts.length}
        index={promptIndex}
        onIndexChange={setPromptIndex}
        label="Prompt"
        minCount={3}
        maxCount={8}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            prompts: [...prev.prompts, emptyPrompt()],
          }));
          setPromptIndex(parsed.prompts.length);
        }}
        onRemove={() => {
          if (!prompt) return;
          patch((prev) => ({
            ...prev,
            prompts: prev.prompts.filter((item) => item.id !== prompt.id),
          }));
        }}
      >
        {prompt ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Prompt words (comma-separated)
              <input
                value={prompt.promptWords.join(", ")}
                onChange={(event) => {
                  const promptWords = splitCsv(event.target.value);
                  patch((prev) => ({
                    ...prev,
                    prompts: prev.prompts.map((item, index) =>
                      index === promptIndex ? { ...item, promptWords } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Required words (comma-separated, min 2)
              <input
                value={prompt.requiredWords.join(", ")}
                onChange={(event) => {
                  const requiredWords = splitCsv(event.target.value);
                  patch((prev) => ({
                    ...prev,
                    prompts: prev.prompts.map((item, index) =>
                      index === promptIndex ? { ...item, requiredWords } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-bold text-stone-700">
                Question word
                <input
                  value={prompt.questionWord}
                  onChange={(event) => {
                    const questionWord = event.target.value;
                    patch((prev) => ({
                      ...prev,
                      prompts: prev.prompts.map((item, index) =>
                        index === promptIndex ? { ...item, questionWord } : item,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                />
              </label>
              <label className="block text-[11px] font-bold text-stone-700">
                Min words
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={prompt.minWords}
                  onChange={(event) => {
                    const minWords = Number(event.target.value) || 3;
                    patch((prev) => ({
                      ...prev,
                      prompts: prev.prompts.map((item, index) =>
                        index === promptIndex ? { ...item, minWords } : item,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                />
              </label>
            </div>
            <label className="block text-[11px] font-bold text-stone-700">
              Helping verbs (comma-separated)
              <input
                value={prompt.helpingVerbs.join(", ")}
                onChange={(event) => {
                  const helpingVerbs = splitCsv(event.target.value);
                  patch((prev) => ({
                    ...prev,
                    prompts: prev.prompts.map((item, index) =>
                      index === promptIndex ? { ...item, helpingVerbs } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Model question
              <input
                value={prompt.modelQuestion}
                onChange={(event) => {
                  const modelQuestion = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    prompts: prev.prompts.map((item, index) =>
                      index === promptIndex ? { ...item, modelQuestion } : item,
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">
          Fix before assign:
          <ul className="mt-1 list-disc pl-4">
            {issues.slice(0, 5).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-emerald-700">
          Question writing looks valid for freeze.
        </p>
      )}
    </div>
  );
}
