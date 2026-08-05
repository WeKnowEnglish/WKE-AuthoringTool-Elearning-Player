"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import type { AssessmentPart } from "@/lib/assessment/types";

type PictureStoryPart = Extract<
  AssessmentPart,
  { kind: "speaking_picture_story" }
>;

type Props = {
  part: PictureStoryPart;
  onChange: (next: PictureStoryPart) => void;
};

function emptyFrame(): PictureStoryPart["activity"]["frames"][number] {
  return {
    id: `frame-${crypto.randomUUID().slice(0, 8)}`,
    src: "",
    alt: "Story frame",
  };
}

export function AssessmentSpeakingPictureStoryPartEditor({
  part,
  onChange,
}: Props) {
  const { prompt, maxDurationSeconds, frames } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(frames.length, part.id);
  const frame = frames[itemIndex];

  const patchActivity = (
    updater: (
      activity: PictureStoryPart["activity"],
    ) => PictureStoryPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={frames.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Frame"
        itemLabels={frames.map((_, index) => `Frame ${index + 1}`)}
        minCount={2}
        maxCount={8}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            frames: [...activity.frames, emptyFrame()],
          }));
          setItemIndex(frames.length);
        }}
        onRemove={() => {
          if (frames.length <= 2 || !frame) return;
          patchActivity((activity) => ({
            ...activity,
            frames: activity.frames.filter((row) => row.id !== frame.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {frame ? (
          <div className="space-y-2">
            <MediaUrlControls
              label={`Frame ${itemIndex + 1}`}
              value={frame.src}
              compact
              onChange={(url) =>
                patchActivity((activity) => ({
                  ...activity,
                  frames: activity.frames.map((row) =>
                    row.id === frame.id ? { ...row, src: url } : row,
                  ),
                }))
              }
            />
            <label className="block text-[11px] font-bold text-stone-700">
              Image alt text
              <input
                value={frame.alt}
                onChange={(event) => {
                  const alt = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    frames: activity.frames.map((row) =>
                      row.id === frame.id ? { ...row, alt } : row,
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
