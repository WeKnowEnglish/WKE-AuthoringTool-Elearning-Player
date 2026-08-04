"use client";

import {
  parsePictureClozeSection,
  pictureClozeSectionValidationIssues,
  type PictureClozeSection,
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

function emptyItem(): PictureClozeSection["items"][number] {
  return {
    id: `cloze-${crypto.randomUUID().slice(0, 8)}`,
    imageUrl: "/pilots/homework-template-one/part-1-q1.jpg",
    imageAlt: "New picture",
    prompt: "Which word fits?",
    sentenceBefore: "It is a ",
    sentenceAfter: ".",
    acceptedAnswers: ["word"],
  };
}

export function PictureClozeSectionEditor({ section, onChange }: Props) {
  const parsed = parsePictureClozeSection(section);
  const issues = pictureClozeSectionValidationIssues(section);
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(
    parsed?.items.length ?? 0,
    parsed?.id,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This picture cloze section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (updater: (prev: PictureClozeSection) => PictureClozeSection) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const item = parsed.items[itemIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Picture cloze content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit the word bank, then one picture item at a time. Answers should appear
          in the bank.
        </p>
      </div>

      <label className="block text-[11px] font-bold text-stone-700">
        Word bank (comma-separated, min 4)
        <textarea
          value={parsed.wordBank.join(", ")}
          onChange={(event) => {
            const wordBank = splitCsv(event.target.value);
            patch((prev) => ({ ...prev, wordBank }));
          }}
          rows={2}
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>

      <AuthoringItemPager
        count={parsed.items.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Item"
        minCount={2}
        maxCount={12}
        onAdd={() => {
          patch((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
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
            <MediaUrlControls
              label="Picture"
              value={item.imageUrl}
              compact
              onChange={(url) =>
                patch((prev) => ({
                  ...prev,
                  items: prev.items.map((row, index) =>
                    index === itemIndex ? { ...row, imageUrl: url } : row,
                  ),
                }))
              }
            />
            <label className="block text-[11px] font-bold text-stone-700">
              Image alt
              <input
                value={item.imageAlt}
                onChange={(event) => {
                  const imageAlt = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) =>
                      index === itemIndex ? { ...row, imageAlt } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Prompt
              <input
                value={item.prompt}
                onChange={(event) => {
                  const prompt = event.target.value;
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) =>
                      index === itemIndex ? { ...row, prompt } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-bold text-stone-700">
                Before blank
                <input
                  value={item.sentenceBefore}
                  onChange={(event) => {
                    const sentenceBefore = event.target.value;
                    patch((prev) => ({
                      ...prev,
                      items: prev.items.map((row, index) =>
                        index === itemIndex ? { ...row, sentenceBefore } : row,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                />
              </label>
              <label className="block text-[11px] font-bold text-stone-700">
                After blank
                <input
                  value={item.sentenceAfter}
                  onChange={(event) => {
                    const sentenceAfter = event.target.value;
                    patch((prev) => ({
                      ...prev,
                      items: prev.items.map((row, index) =>
                        index === itemIndex ? { ...row, sentenceAfter } : row,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                />
              </label>
            </div>
            <label className="block text-[11px] font-bold text-stone-700">
              Accepted answers (comma-separated)
              <input
                value={item.acceptedAnswers.join(", ")}
                onChange={(event) => {
                  const acceptedAnswers = splitCsv(event.target.value);
                  patch((prev) => ({
                    ...prev,
                    items: prev.items.map((row, index) =>
                      index === itemIndex ? { ...row, acceptedAnswers } : row,
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
          Picture cloze looks valid for freeze.
        </p>
      )}
    </div>
  );
}
