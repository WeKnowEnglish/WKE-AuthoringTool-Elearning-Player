"use client";

import {
  parsePictureWritingAuthoringSection,
  pictureWritingSectionValidationIssues,
  type PictureWritingSection,
} from "@/lib/homework-templates/homework-template-one";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
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

function emptyPrompt(): PictureWritingSection["prompts"][number] {
  return {
    id: `write-${crypto.randomUUID().slice(0, 8)}`,
    imageUrl: "/pilots/homework-template-one/part-5-q1.jpg",
    imageAlt: "Describe this picture",
    question: "What happened?",
    promptWords: ["someone", "did", "something"],
    requiredWords: ["someone", "something"],
    sentenceStarter: "Someone",
    minWords: 6,
  };
}

export function PictureWritingSectionEditor({ section, onChange }: Props) {
  const parsed = parsePictureWritingAuthoringSection(section);
  const issues = pictureWritingSectionValidationIssues(section);
  const [promptIndex, setPromptIndex] = useAuthoringItemIndex(
    parsed?.prompts.length ?? 0,
    parsed?.id,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This picture writing section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (
    updater: (prev: PictureWritingSection) => PictureWritingSection,
  ) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const prompt = parsed.prompts[promptIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Picture writing content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit one prompt at a time: picture, question, and prompt/required words
          (min 2, max 5).
        </p>
      </div>

      <AuthoringItemPager
        count={parsed.prompts.length}
        index={promptIndex}
        onIndexChange={setPromptIndex}
        label="Prompt"
        minCount={2}
        maxCount={5}
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
            <MediaUrlControls
              label="Picture"
              value={prompt.imageUrl}
              compact
              onChange={(url) =>
                patch((prev) => ({
                  ...prev,
                  prompts: prev.prompts.map((item, index) =>
                    index === promptIndex ? { ...item, imageUrl: url } : item,
                  ),
                }))
              }
            />
            <label className="block text-[11px] font-bold text-stone-700">
              Image alt
              <input
                value={prompt.imageAlt}
                onChange={(event) => {
                  const imageAlt = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    prompts: prev.prompts.map((item, index) =>
                      index === promptIndex ? { ...item, imageAlt } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Question
              <input
                value={prompt.question}
                onChange={(event) => {
                  const question = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    prompts: prev.prompts.map((item, index) =>
                      index === promptIndex ? { ...item, question } : item,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Prompt words (comma-separated, 2–5)
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
              Required words (comma-separated, 1–4)
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
                Sentence starter
                <input
                  value={prompt.sentenceStarter ?? ""}
                  onChange={(event) => {
                    const sentenceStarter = event.target.value;
                    patch((prev) => ({
                      ...prev,
                      prompts: prev.prompts.map((item, index) =>
                        index === promptIndex
                          ? {
                              ...item,
                              sentenceStarter: sentenceStarter || undefined,
                            }
                          : item,
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
                  min={4}
                  max={20}
                  value={prompt.minWords}
                  onChange={(event) => {
                    const minWords = Number(event.target.value) || 4;
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
          Picture writing looks valid for freeze.
        </p>
      )}
    </div>
  );
}
