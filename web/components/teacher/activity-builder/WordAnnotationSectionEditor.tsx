"use client";

import {
  parseWordAnnotationSection,
  wordAnnotationSectionValidationIssues,
  WORD_ANNOTATION_ROLES,
  type WordAnnotationRole,
  type WordAnnotationSection,
} from "@/lib/homework-templates/homework-template-one";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

type Token = WordAnnotationSection["sentences"][number]["tokens"][number];

function cycleRole(role: Token["role"]): Token["role"] {
  if (role === null) return "adjective";
  if (role === "adjective") return "adverb";
  return null;
}

function roleLabel(role: Token["role"]): string {
  if (role === "adjective") return "Adj";
  if (role === "adverb") return "Adv";
  return "—";
}

function roleClass(role: Token["role"]): string {
  if (role === "adjective") return "border-sky-500 bg-sky-100 text-sky-950";
  if (role === "adverb") return "border-violet-500 bg-violet-100 text-violet-950";
  return "border-stone-300 bg-white text-stone-800";
}

function emptySentence(): WordAnnotationSection["sentences"][number] {
  const id = `mark-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    tokens: [
      { id: `${id}-t1`, text: "The", role: null },
      { id: `${id}-t2`, text: "quick", role: "adjective" },
      { id: `${id}-t3`, text: "fox", role: null },
      { id: `${id}-t4`, text: "runs", role: null },
      { id: `${id}-t5`, text: "quickly", role: "adverb" },
      { id: `${id}-t6`, text: ".", role: null },
    ],
  };
}

function retokenize(sentenceId: string, text: string): Token[] {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return [
      { id: `${sentenceId}-t1`, text: parts[0] || "Word", role: null },
      { id: `${sentenceId}-t2`, text: ".", role: null },
    ];
  }
  return parts.map((word, index) => ({
    id: `${sentenceId}-t${index + 1}`,
    text: word,
    role: null as WordAnnotationRole | null,
  }));
}

export function WordAnnotationSectionEditor({ section, onChange }: Props) {
  const parsed = parseWordAnnotationSection(section);
  const issues = wordAnnotationSectionValidationIssues(section);
  const [sentenceIndex, setSentenceIndex] = useAuthoringItemIndex(
    parsed?.sentences.length ?? 0,
    parsed?.id,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This word annotation section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: WordAnnotationSection) => WordAnnotationSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const sentence = parsed.sentences[sentenceIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Word annotation content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Tap a word to cycle role: none → adjective → adverb. Edit one sentence at
          a time (min 3, max 8).
        </p>
      </div>

      <label className="block text-[11px] font-bold text-stone-700">
        Remember tip
        <textarea
          value={parsed.rememberText}
          onChange={(event) => {
            const rememberText = event.target.value;
            patch((prev) => ({ ...prev, rememberText }));
          }}
          rows={2}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>

      <AuthoringItemPager
        count={parsed.sentences.length}
        index={sentenceIndex}
        onIndexChange={setSentenceIndex}
        label="Sentence"
        minCount={3}
        maxCount={8}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            sentences: [...prev.sentences, emptySentence()],
          }));
          setSentenceIndex(parsed.sentences.length);
        }}
        onRemove={() => {
          if (!sentence) return;
          patch((prev) => ({
            ...prev,
            sentences: prev.sentences.filter((item) => item.id !== sentence.id),
          }));
        }}
      >
        {sentence ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Retokenize from text (clears roles)
              <input
                defaultValue={sentence.tokens.map((token) => token.text).join(" ")}
                key={`${sentence.id}:${sentence.tokens.map((t) => t.text).join(" ")}`}
                onBlur={(event) => {
                  const next = retokenize(sentence.id, event.target.value);
                  patch((prev) => ({
                    ...prev,
                    sentences: prev.sentences.map((item, index) =>
                      index === sentenceIndex ? { ...item, tokens: next } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {sentence.tokens.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  title="Click to cycle role"
                  onClick={() =>
                    patch((prev) => ({
                      ...prev,
                      sentences: prev.sentences.map((item, index) =>
                        index !== sentenceIndex
                          ? item
                          : {
                              ...item,
                              tokens: item.tokens.map((row) =>
                                row.id === token.id
                                  ? { ...row, role: cycleRole(row.role) }
                                  : row,
                              ),
                            },
                      ),
                    }))
                  }
                  className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2 text-xs font-bold ${roleClass(token.role)}`}
                >
                  <span>{token.text}</span>
                  <span className="text-[10px] opacity-70">{roleLabel(token.role)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              {sentence.tokens.map((token) => (
                <label
                  key={`${token.id}-edit`}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] font-bold text-stone-700"
                >
                  <input
                    value={token.text}
                    onChange={(event) => {
                      const text = event.target.value;
                      patch((prev) => ({
                        ...prev,
                        sentences: prev.sentences.map((item, index) =>
                          index !== sentenceIndex
                            ? item
                            : {
                                ...item,
                                tokens: item.tokens.map((row) =>
                                  row.id === token.id ? { ...row, text } : row,
                                ),
                              },
                        ),
                      }));
                    }}
                    className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs font-semibold"
                  />
                  <select
                    value={token.role ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const role =
                        raw === "adjective" || raw === "adverb" ? raw : null;
                      patch((prev) => ({
                        ...prev,
                        sentences: prev.sentences.map((item, index) =>
                          index !== sentenceIndex
                            ? item
                            : {
                                ...item,
                                tokens: item.tokens.map((row) =>
                                  row.id === token.id ? { ...row, role } : row,
                                ),
                              },
                        ),
                      }));
                    }}
                    className="rounded-lg border border-stone-300 px-1.5 py-1 text-[11px] font-semibold"
                  >
                    <option value="">None</option>
                    {WORD_ANNOTATION_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
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
          Word annotation looks valid for freeze.
        </p>
      )}
    </div>
  );
}
