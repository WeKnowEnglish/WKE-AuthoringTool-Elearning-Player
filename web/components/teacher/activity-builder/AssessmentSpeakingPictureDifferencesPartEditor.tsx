"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import type { AssessmentPart } from "@/lib/assessment/types";

type DifferencesPart = Extract<
  AssessmentPart,
  { kind: "speaking_picture_differences" }
>;

type Props = {
  part: DifferencesPart;
  onChange: (next: DifferencesPart) => void;
};

function emptyImage(label: string): DifferencesPart["activity"]["images"][number] {
  return {
    src: "",
    alt: label,
    label,
  };
}

export function AssessmentSpeakingPictureDifferencesPartEditor({
  part,
  onChange,
}: Props) {
  const { prompt, maxDurationSeconds, images } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(images.length, part.id);
  const image = images[itemIndex];

  const patchActivity = (
    updater: (
      activity: DifferencesPart["activity"],
    ) => DifferencesPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={images.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Picture"
        itemLabels={images.map((row) => row.label.trim() || "Picture")}
        minCount={2}
        maxCount={4}
        onAdd={() => {
          const label = `Picture ${String.fromCharCode(65 + images.length)}`;
          patchActivity((activity) => ({
            ...activity,
            images: [...activity.images, emptyImage(label)],
          }));
          setItemIndex(images.length);
        }}
        onRemove={() => {
          if (images.length <= 2 || !image) return;
          patchActivity((activity) => ({
            ...activity,
            images: activity.images.filter((_, index) => index !== itemIndex),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {image ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Label
              <input
                value={image.label}
                onChange={(event) => {
                  const label = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    images: activity.images.map((row, index) =>
                      index === itemIndex ? { ...row, label } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <MediaUrlControls
              label="Picture"
              value={image.src}
              compact
              onChange={(url) =>
                patchActivity((activity) => ({
                  ...activity,
                  images: activity.images.map((row, index) =>
                    index === itemIndex ? { ...row, src: url } : row,
                  ),
                }))
              }
            />
            <label className="block text-[11px] font-bold text-stone-700">
              Image alt text
              <input
                value={image.alt}
                onChange={(event) => {
                  const alt = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    images: activity.images.map((row, index) =>
                      index === itemIndex ? { ...row, alt } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Speaking setup" defaultOpen={false}>
        <label className="block text-[11px] font-bold text-stone-700">
          Student prompt
          <textarea
            value={prompt}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                prompt: event.target.value,
              }))
            }
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
          />
        </label>

        <label className="block text-[11px] font-bold text-stone-700">
          Max seconds
          <input
            type="number"
            min={15}
            max={600}
            value={maxDurationSeconds}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              patchActivity((activity) => ({
                ...activity,
                maxDurationSeconds: Math.round(next),
              }));
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>
      </AssessmentInspectorSection>
    </div>
  );
}
