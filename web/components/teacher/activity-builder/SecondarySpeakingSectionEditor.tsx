"use client";

import {
  parseSecondarySpeakingAuthoringSection,
  secondarySpeakingSectionValidationIssues,
  type SecondarySpeakingSection,
} from "@/lib/homework-templates/secondary-homework-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

export function SecondarySpeakingSectionEditor({ section, onChange }: Props) {
  const parsed = parseSecondarySpeakingAuthoringSection(section);
  const issues = secondarySpeakingSectionValidationIssues(section);
  const [promptIndex, setPromptIndex] = useAuthoringItemIndex(
    parsed?.planningPrompts.length ?? 0,
    parsed?.partId,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This speaking section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: SecondarySpeakingSection) => SecondarySpeakingSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const prompt = parsed.planningPrompts[promptIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Speaking prompt content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit one planning prompt at a time, then recording limits for the oral
          response.
        </p>
      </div>

      <AuthoringItemPager
        count={parsed.planningPrompts.length}
        index={promptIndex}
        onIndexChange={setPromptIndex}
        label="Prompt"
        minCount={1}
        maxCount={8}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            planningPrompts: [...prev.planningPrompts, "New planning tip."],
          }));
          setPromptIndex(parsed.planningPrompts.length);
        }}
        onRemove={() => {
          patch((prev) => ({
            ...prev,
            planningPrompts: prev.planningPrompts.filter(
              (_, i) => i !== promptIndex,
            ),
          }));
        }}
      >
        {typeof prompt === "string" ? (
          <label className="block text-[11px] font-bold text-stone-700">
            Text
            <input
              value={prompt}
              onChange={(event) => {
                const value = event.target.value;
                patch((prev) => ({
                  ...prev,
                  planningPrompts: prev.planningPrompts.map((item, i) =>
                    i === promptIndex ? value : item,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
            />
          </label>
        ) : null}
      </AuthoringItemPager>

      <label className="block text-[11px] font-bold text-stone-700">
        Response id
        <input
          value={parsed.responseId}
          onChange={(event) => {
            const responseId = event.target.value;
            patch((prev) => ({ ...prev, responseId }));
          }}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[11px] font-bold text-stone-700">
          Max seconds
          <input
            type="number"
            min={15}
            max={600}
            value={parsed.maxDurationSeconds}
            onChange={(event) => {
              const maxDurationSeconds = Number(event.target.value);
              if (!Number.isFinite(maxDurationSeconds)) return;
              patch((prev) => ({ ...prev, maxDurationSeconds }));
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>
        <label className="block text-[11px] font-bold text-stone-700">
          Teacher score total
          <input
            type="number"
            min={1}
            max={20}
            value={parsed.teacherScoreTotal}
            onChange={(event) => {
              const teacherScoreTotal = Number(event.target.value);
              if (!Number.isFinite(teacherScoreTotal)) return;
              patch((prev) => ({ ...prev, teacherScoreTotal }));
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>
      </div>

      {issues.length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-800">
          Keep editing — {issues[0]}
        </p>
      ) : null}
    </div>
  );
}
