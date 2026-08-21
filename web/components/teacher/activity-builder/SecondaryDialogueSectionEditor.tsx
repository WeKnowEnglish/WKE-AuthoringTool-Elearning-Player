"use client";

import {
  parseSecondaryDialogueAuthoringSection,
  secondaryDialogueSectionValidationIssues,
  type SecondaryDialogueSection,
} from "@/lib/homework-templates/secondary-homework-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function splitAccepted(value: string): string[] | undefined {
  const items = value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function emptyLine(): SecondaryDialogueSection["lines"][number] {
  return {
    id: `dialogue-${crypto.randomUUID().slice(0, 8)}`,
    speaker: "Student",
    before: "I",
    after: "home early.",
    clue: "go",
    answer: "went",
  };
}

export function SecondaryDialogueSectionEditor({ section, onChange }: Props) {
  const parsed = parseSecondaryDialogueAuthoringSection(section);
  const issues = secondaryDialogueSectionValidationIssues(section);
  const [lineIndex, setLineIndex] = useAuthoringItemIndex(
    parsed?.lines.length ?? 0,
    parsed?.partId,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This dialogue section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: SecondaryDialogueSection) => SecondaryDialogueSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const line = parsed.lines[lineIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Dialogue content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit one line at a time (max 30). Use accepted answers for contractions.
          Line order is preserved.
        </p>
      </div>

      <AuthoringItemPager
        count={parsed.lines.length}
        index={lineIndex}
        onIndexChange={setLineIndex}
        label="Line"
        minCount={1}
        maxCount={30}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            lines: [...prev.lines, emptyLine()],
          }));
          setLineIndex(parsed.lines.length);
        }}
        onRemove={() => {
          if (!line) return;
          patch((prev) => ({
            ...prev,
            lines: prev.lines.filter((item) => item.id !== line.id),
          }));
        }}
      >
        {line ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Speaker
              <input
                value={line.speaker}
                onChange={(event) => {
                  const speaker = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    lines: prev.lines.map((item, index) =>
                      index === lineIndex ? { ...item, speaker } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Clue (verb hint)
              <input
                value={line.clue}
                onChange={(event) => {
                  const clue = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    lines: prev.lines.map((item, index) =>
                      index === lineIndex ? { ...item, clue } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700 sm:col-span-2">
              Before blank
              <input
                value={line.before}
                onChange={(event) => {
                  const before = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    lines: prev.lines.map((item, index) =>
                      index === lineIndex ? { ...item, before } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700 sm:col-span-2">
              After blank
              <input
                value={line.after}
                onChange={(event) => {
                  const after = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    lines: prev.lines.map((item, index) =>
                      index === lineIndex ? { ...item, after } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Answer
              <input
                value={line.answer}
                onChange={(event) => {
                  const answer = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    lines: prev.lines.map((item, index) =>
                      index === lineIndex ? { ...item, answer } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Accepted (comma-separated)
              <input
                value={(line.accepted ?? []).join(", ")}
                onChange={(event) => {
                  const accepted = splitAccepted(event.target.value);
                  patch((prev) => ({
                    ...prev,
                    lines: prev.lines.map((item, index) =>
                      index === lineIndex ? { ...item, accepted } : item,
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
