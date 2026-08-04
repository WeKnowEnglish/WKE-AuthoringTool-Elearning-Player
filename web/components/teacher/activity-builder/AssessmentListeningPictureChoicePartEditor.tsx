"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentListeningAudioFields } from "@/components/teacher/activity-builder/AssessmentListeningAudioFields";
import type { AssessmentPart } from "@/lib/assessment/types";

type PictureChoicePart = Extract<
  AssessmentPart,
  { kind: "listening_picture_choice" }
>;

type Props = {
  part: PictureChoicePart;
  onChange: (next: PictureChoicePart) => void;
};

function emptyChoice(label: string): PictureChoicePart["activity"]["items"][number]["choices"][number] {
  return {
    id: `pc-${crypto.randomUUID().slice(0, 8)}`,
    imageSrc: "",
    imageAlt: "Choice picture",
    label,
  };
}

function emptyItem(): PictureChoicePart["activity"]["items"][number] {
  const choices = [
    emptyChoice("A"),
    emptyChoice("B"),
    emptyChoice("C"),
  ];
  return {
    id: `item-${crypto.randomUUID().slice(0, 8)}`,
    audioText: "New listening item.",
    choices,
    correctChoiceId: choices[0]?.id ?? "",
  };
}

export function AssessmentListeningPictureChoicePartEditor({
  part,
  onChange,
}: Props) {
  const { items } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(items.length, part.id);
  const item = items[itemIndex];
  const [choiceIndex, setChoiceIndex] = useAuthoringItemIndex(
    item?.choices.length ?? 0,
    `${part.id}-${item?.id ?? "none"}-choice`,
  );
  const choice = item?.choices[choiceIndex];

  const patchActivity = (
    updater: (
      activity: PictureChoicePart["activity"],
    ) => PictureChoicePart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  const patchItem = (
    updater: (
      row: PictureChoicePart["activity"]["items"][number],
    ) => PictureChoicePart["activity"]["items"][number],
  ) => {
    if (!item) return;
    patchActivity((activity) => ({
      ...activity,
      items: activity.items.map((row) =>
        row.id === item.id ? updater(row) : row,
      ),
    }));
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        Listening · picture choice
      </p>

      <AuthoringItemPager
        count={items.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Item"
        itemLabels={items.map(
          (row, index) => row.audioText.trim() || `Item ${index + 1}`,
        )}
        minCount={1}
        maxCount={10}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            items: [...activity.items, emptyItem()],
          }));
          setItemIndex(items.length);
        }}
        onRemove={() => {
          if (items.length <= 1 || !item) return;
          patchActivity((activity) => ({
            ...activity,
            items: activity.items.filter((row) => row.id !== item.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {item ? (
          <div className="space-y-3">
            <AssessmentListeningAudioFields
              audioText={item.audioText}
              audioUrl={item.audioUrl}
              clipLabel={`Question ${itemIndex + 1} audio`}
              onChange={(next) =>
                patchItem((row) => ({
                  ...row,
                  audioText: next.audioText,
                  ...(next.audioUrl
                    ? { audioUrl: next.audioUrl }
                    : { audioUrl: undefined }),
                }))
              }
            />

            <label className="block text-[11px] font-bold text-stone-700">
              Correct choice
              <select
                value={item.correctChoiceId}
                onChange={(event) => {
                  const correctChoiceId = event.target.value;
                  patchItem((row) => ({ ...row, correctChoiceId }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              >
                <option value="">Choose…</option>
                {item.choices.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}. {row.imageAlt || "picture"}
                  </option>
                ))}
              </select>
            </label>

            <AuthoringItemPager
              count={item.choices.length}
              index={choiceIndex}
              onIndexChange={setChoiceIndex}
              label="Picture"
              itemLabels={item.choices.map((row) => row.label.trim() || "Pic")}
              minCount={2}
              maxCount={4}
              onAdd={() => {
                const label = String.fromCharCode(65 + item.choices.length);
                patchItem((row) => ({
                  ...row,
                  choices: [...row.choices, emptyChoice(label)],
                }));
                setChoiceIndex(item.choices.length);
              }}
              onRemove={() => {
                if (item.choices.length <= 2 || !choice) return;
                patchItem((row) => {
                  const nextChoices = row.choices.filter(
                    (entry) => entry.id !== choice.id,
                  );
                  return {
                    ...row,
                    choices: nextChoices,
                    correctChoiceId:
                      row.correctChoiceId === choice.id
                        ? (nextChoices[0]?.id ?? "")
                        : row.correctChoiceId,
                  };
                });
                setChoiceIndex(Math.max(0, choiceIndex - 1));
              }}
            >
              {choice ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-stone-700">
                    Label
                    <input
                      value={choice.label}
                      onChange={(event) => {
                        const label = event.target.value;
                        patchItem((row) => ({
                          ...row,
                          choices: row.choices.map((entry) =>
                            entry.id === choice.id
                              ? { ...entry, label }
                              : entry,
                          ),
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                    />
                  </label>
                  <MediaUrlControls
                    label="Picture"
                    value={choice.imageSrc}
                    compact
                    onChange={(url) =>
                      patchItem((row) => ({
                        ...row,
                        choices: row.choices.map((entry) =>
                          entry.id === choice.id
                            ? { ...entry, imageSrc: url }
                            : entry,
                        ),
                      }))
                    }
                  />
                  <label className="block text-[11px] font-bold text-stone-700">
                    Image alt text
                    <input
                      value={choice.imageAlt}
                      onChange={(event) => {
                        const imageAlt = event.target.value;
                        patchItem((row) => ({
                          ...row,
                          choices: row.choices.map((entry) =>
                            entry.id === choice.id
                              ? { ...entry, imageAlt }
                              : entry,
                          ),
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                    />
                  </label>
                </div>
              ) : null}
            </AuthoringItemPager>
          </div>
        ) : null}
      </AuthoringItemPager>
    </div>
  );
}
