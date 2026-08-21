"use client";

import {
  parseSentenceColumnsAuthoringSection,
  sentenceColumnsSectionValidationIssues,
  SENTENCE_COLUMN_IDS,
  type SentenceColumnId,
  type SentenceColumnsSection,
} from "@/lib/homework-templates/homework-template-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function emptyChallenge(): SentenceColumnsSection["challenges"][number] {
  const id = `build-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    pieces: SENTENCE_COLUMN_IDS.map((columnId) => ({
      id: `${id}-${columnId}`,
      text: columnId === "subject" ? "Someone" : columnId === "action" ? "does" : "something",
      columnId,
    })),
  };
}

function pieceForColumn(
  challenge: SentenceColumnsSection["challenges"][number],
  columnId: SentenceColumnId,
) {
  return challenge.pieces.find((piece) => piece.columnId === columnId);
}

export function SentenceColumnsSectionEditor({ section, onChange }: Props) {
  const parsed = parseSentenceColumnsAuthoringSection(section);
  const issues = sentenceColumnsSectionValidationIssues(section);
  const [challengeIndex, setChallengeIndex] = useAuthoringItemIndex(
    parsed?.challenges.length ?? 0,
    parsed?.id,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This sentence columns section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: SentenceColumnsSection) => SentenceColumnsSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const challenge = parsed.challenges[challengeIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Sentence columns content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit column labels, then one challenge at a time (min 3, max 6).
        </p>
      </div>

      <div className="space-y-2">
        {parsed.columns.map((column, columnIndex) => (
          <div
            key={column.id}
            className="rounded-lg border border-stone-200 bg-white p-2"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
              Column: {column.id}
            </p>
            <label className="mt-1 block text-[11px] font-bold text-stone-700">
              Label
              <input
                value={column.label}
                onChange={(event) => {
                  const label = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    columns: prev.columns.map((col, index) =>
                      index === columnIndex ? { ...col, label } : col,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="mt-1 block text-[11px] font-bold text-stone-700">
              Prompt
              <input
                value={column.prompt}
                onChange={(event) => {
                  const prompt = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    columns: prev.columns.map((col, index) =>
                      index === columnIndex ? { ...col, prompt } : col,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
          </div>
        ))}
      </div>

      <AuthoringItemPager
        count={parsed.challenges.length}
        index={challengeIndex}
        onIndexChange={setChallengeIndex}
        label="Challenge"
        minCount={3}
        maxCount={6}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            challenges: [...prev.challenges, emptyChallenge()],
          }));
          setChallengeIndex(parsed.challenges.length);
        }}
        onRemove={() => {
          if (!challenge) return;
          patch((prev) => ({
            ...prev,
            challenges: prev.challenges.filter((item) => item.id !== challenge.id),
          }));
        }}
      >
        {challenge ? (
          <div className="space-y-2">
            {SENTENCE_COLUMN_IDS.map((columnId) => {
              const piece = pieceForColumn(challenge, columnId);
              if (!piece) return null;
              return (
                <label
                  key={piece.id}
                  className="block text-[11px] font-bold text-stone-700"
                >
                  {columnId}
                  <input
                    value={piece.text}
                    onChange={(event) => {
                      const text = event.target.value;
                      patch((prev) => ({
                        ...prev,
                        challenges: prev.challenges.map((item, index) =>
                          index !== challengeIndex
                            ? item
                            : {
                                ...item,
                                pieces: item.pieces.map((row) =>
                                  row.columnId === columnId
                                    ? { ...row, text }
                                    : row,
                                ),
                              },
                        ),
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                  />
                </label>
              );
            })}
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
          Sentence columns looks valid for freeze.
        </p>
      )}
    </div>
  );
}
