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

type ColourPicturePart = Extract<
  AssessmentPart,
  { kind: "listening_colour_picture" }
>;

type Target = ColourPicturePart["activity"]["targets"][number];
type PaletteColour = ColourPicturePart["activity"]["palette"][number];

type Props = {
  part: ColourPicturePart;
  onChange: (next: ColourPicturePart) => void;
};

function emptyColour(): PaletteColour {
  return {
    id: `col-${crypto.randomUUID().slice(0, 8)}`,
    label: "New colour",
    hex: "#64748b",
  };
}

function emptyTarget(palette: PaletteColour[]): Target {
  return {
    id: `tgt-${crypto.randomUUID().slice(0, 8)}`,
    label: "Object",
    xPercent: 20,
    yPercent: 20,
    widthPercent: 18,
    heightPercent: 16,
    correctColourId: palette[0]?.id ?? "",
  };
}

export function AssessmentListeningColourPicturePartEditor({
  part,
  onChange,
}: Props) {
  const { audioText, audioUrl, image, palette, targets } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(targets.length, part.id);
  const target = targets[itemIndex];

  const patchActivity = (
    updater: (
      activity: ColourPicturePart["activity"],
    ) => ColourPicturePart["activity"],
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
        Listening · colour picture
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
        label="Scene image"
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
          <p className="text-[11px] font-bold text-stone-700">Colour palette</p>
          <button
            type="button"
            onClick={() =>
              patchActivity((activity) => ({
                ...activity,
                palette: [...activity.palette, emptyColour()],
              }))
            }
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
          >
            Add
          </button>
        </div>
        <ul className="space-y-1.5">
          {palette.map((colour) => (
            <li key={colour.id} className="flex items-center gap-1.5">
              <input
                type="color"
                value={colour.hex}
                onChange={(event) => {
                  const hex = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    palette: activity.palette.map((row) =>
                      row.id === colour.id ? { ...row, hex } : row,
                    ),
                  }));
                }}
                className="h-7 w-7 shrink-0 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                aria-label={`${colour.label} colour`}
              />
              <input
                value={colour.label}
                onChange={(event) => {
                  const label = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    palette: activity.palette.map((row) =>
                      row.id === colour.id ? { ...row, label } : row,
                    ),
                  }));
                }}
                className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold"
                aria-label="Colour label"
              />
              <button
                type="button"
                disabled={palette.length <= 2}
                onClick={() =>
                  patchActivity((activity) => ({
                    ...activity,
                    palette: activity.palette.filter(
                      (row) => row.id !== colour.id,
                    ),
                    targets: activity.targets.map((row) =>
                      row.correctColourId === colour.id
                        ? {
                            ...row,
                            correctColourId:
                              activity.palette.find(
                                (item) => item.id !== colour.id,
                              )?.id ?? "",
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
      </div>

      <AssessmentHitboxStage
        imageSrc={image.src}
        imageAlt={image.alt}
        emptyHint="Add a scene image to place hitboxes"
        aspectClassName="aspect-video"
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
          const colour = palette.find((item) => item.id === row.correctColourId);
          return {
            id: row.id,
            label: row.label,
            xPercent: row.xPercent,
            yPercent: row.yPercent,
            widthPercent: row.widthPercent,
            heightPercent: row.heightPercent,
            accentHex: colour?.hex,
          };
        })}
        hint="Select a hitbox, drag to move, use the corner handle to resize. Expand for precise placement."
      />

      <AuthoringItemPager
        count={targets.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Target"
        itemLabels={targets.map((row) => row.label)}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            targets: [...activity.targets, emptyTarget(activity.palette)],
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
              Correct colour
              <select
                value={target.correctColourId}
                onChange={(event) => {
                  const correctColourId = event.target.value;
                  updateTarget(target.id, { ...target, correctColourId });
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              >
                <option value="">Choose…</option>
                {palette.map((colour) => (
                  <option key={colour.id} value={colour.id}>
                    {colour.label}
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
