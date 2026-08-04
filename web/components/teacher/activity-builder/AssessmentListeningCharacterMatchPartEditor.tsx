"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentListeningAudioFields } from "@/components/teacher/activity-builder/AssessmentListeningAudioFields";
import {
  AssessmentHitboxStage,
  patchHitboxGeometry,
} from "@/components/teacher/activity-builder/AssessmentHitboxStage";
import type { AssessmentPart } from "@/lib/assessment/types";

type CharacterMatchPart = Extract<
  AssessmentPart,
  { kind: "listening_character_match" }
>;

type Target = CharacterMatchPart["activity"]["targets"][number];

type Props = {
  part: CharacterMatchPart;
  onChange: (next: CharacterMatchPart) => void;
};

function emptyName(): CharacterMatchPart["activity"]["names"][number] {
  return {
    id: `name-${crypto.randomUUID().slice(0, 8)}`,
    name: "Name",
  };
}

function emptyTarget(
  names: CharacterMatchPart["activity"]["names"],
  label: string,
): Target {
  return {
    id: `tgt-${crypto.randomUUID().slice(0, 8)}`,
    label,
    xPercent: 20,
    yPercent: 20,
    widthPercent: 14,
    heightPercent: 22,
    correctNameId: names[0]?.id ?? "",
  };
}

export function AssessmentListeningCharacterMatchPartEditor({
  part,
  onChange,
}: Props) {
  const { audioText, audioUrl, image, names, targets } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(targets.length, part.id);
  const target = targets[itemIndex];

  const patchActivity = (
    updater: (
      activity: CharacterMatchPart["activity"],
    ) => CharacterMatchPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  const updateTarget = (id: string, next: Target) => {
    patchActivity((activity) => ({
      ...activity,
      targets: activity.targets.map((row) => (row.id === id ? next : row)),
    }));
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        Listening · names on scene
      </p>
      <p className="text-[11px] font-semibold text-stone-500">
        One scene picture, hitboxes on people, and a name bank. Students draw
        lines from names to hitboxes.
      </p>

      <AssessmentListeningAudioFields
        audioText={audioText}
        audioUrl={audioUrl}
        onChange={(next) =>
          patchActivity((activity) => ({
            ...activity,
            audioText: next.audioText,
            ...(next.audioUrl ? { audioUrl: next.audioUrl } : { audioUrl: undefined }),
          }))
        }
      />

      <MediaUrlControls
        label="Scene picture"
        value={image.src}
        compact
        onChange={(url) =>
          patchActivity((activity) => ({
            ...activity,
            image: { ...activity.image, src: url },
          }))
        }
      />
      <label className="block text-[11px] font-bold text-stone-700">
        Image alt text
        <input
          value={image.alt}
          onChange={(event) =>
            patchActivity((activity) => ({
              ...activity,
              image: { ...activity.image, alt: event.target.value },
            }))
          }
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>

      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-stone-700">Name bank</p>
          <button
            type="button"
            onClick={() =>
              patchActivity((activity) => ({
                ...activity,
                names: [...activity.names, emptyName()],
              }))
            }
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
          >
            Add
          </button>
        </div>
        <ul className="space-y-1.5">
          {names.map((name) => (
            <li key={name.id} className="flex items-center gap-1.5">
              <input
                value={name.name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    names: activity.names.map((row) =>
                      row.id === name.id ? { ...row, name: nextName } : row,
                    ),
                  }));
                }}
                className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold"
                aria-label="Name"
              />
              <button
                type="button"
                disabled={names.length <= 2}
                onClick={() =>
                  patchActivity((activity) => ({
                    ...activity,
                    names: activity.names.filter((row) => row.id !== name.id),
                    targets: activity.targets.map((row) =>
                      row.correctNameId === name.id
                        ? {
                            ...row,
                            correctNameId:
                              activity.names.find((item) => item.id !== name.id)
                                ?.id ?? "",
                          }
                        : row,
                    ),
                  }))
                }
                className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-35"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[10px] font-semibold text-stone-500">
          Include extra names students should not use.
        </p>
      </div>

      <AssessmentHitboxStage
        imageSrc={image.src}
        imageAlt={image.alt}
        emptyHint="Add a scene picture to place people hitboxes"
        selectedId={target?.id ?? null}
        onSelect={(id) => {
          const index = targets.findIndex((row) => row.id === id);
          if (index >= 0) setItemIndex(index);
        }}
        onPatchGeometry={(id, next) => {
          const row = targets.find((item) => item.id === id);
          if (!row) return;
          updateTarget(id, { ...row, ...next });
        }}
        targets={targets.map((row) => {
          const correctName = names.find((name) => name.id === row.correctNameId);
          return {
            id: row.id,
            label: row.label,
            detail: correctName?.name,
            xPercent: row.xPercent,
            yPercent: row.yPercent,
            widthPercent: row.widthPercent,
            heightPercent: row.heightPercent,
          };
        })}
        hint="Select a hitbox, drag to move, corner handle to resize. Expand for precise placement."
      />

      <AuthoringItemPager
        count={targets.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Person"
        itemLabels={targets.map((row) => row.label)}
        minCount={1}
        maxCount={10}
        onAdd={() => {
          const label = String.fromCharCode(65 + targets.length);
          patchActivity((activity) => ({
            ...activity,
            targets: [
              ...activity.targets,
              emptyTarget(activity.names, label),
            ],
          }));
          setItemIndex(targets.length);
        }}
        onRemove={() => {
          if (targets.length <= 1 || !target) return;
          patchActivity((activity) => ({
            ...activity,
            targets: activity.targets.filter((row) => row.id !== target.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {target ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Label
              <input
                value={target.label}
                onChange={(event) => {
                  const label = event.target.value;
                  updateTarget(target.id, { ...target, label });
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Correct name
              <select
                value={target.correctNameId}
                onChange={(event) => {
                  const correctNameId = event.target.value;
                  updateTarget(target.id, { ...target, correctNameId });
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              >
                <option value="">Choose…</option>
                {names.map((name) => (
                  <option key={name.id} value={name.id}>
                    {name.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["xPercent", "X %"],
                  ["yPercent", "Y %"],
                  ["widthPercent", "Width %"],
                  ["heightPercent", "Height %"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="block text-[11px] font-bold text-stone-700"
                >
                  {label}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={target[key]}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      updateTarget(target.id, {
                        ...target,
                        ...patchHitboxGeometry(target, { [key]: value }),
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </AuthoringItemPager>
    </div>
  );
}
