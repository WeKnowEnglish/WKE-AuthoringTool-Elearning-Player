"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import { AssessmentListeningAudioFields } from "@/components/teacher/activity-builder/AssessmentListeningAudioFields";
import type { AssessmentPart } from "@/lib/assessment/types";

type ItemMatchPart = Extract<AssessmentPart, { kind: "listening_item_match" }>;

type Props = {
  part: ItemMatchPart;
  onChange: (next: ItemMatchPart) => void;
};

function emptyChoice(): ItemMatchPart["activity"]["choices"][number] {
  return {
    id: `choice-${crypto.randomUUID().slice(0, 8)}`,
    label: "New activity",
  };
}

function emptyPrompt(
  choices: ItemMatchPart["activity"]["choices"],
): ItemMatchPart["activity"]["prompts"][number] {
  return {
    id: `prompt-${crypto.randomUUID().slice(0, 8)}`,
    label: "Person",
    correctChoiceId: choices[0]?.id ?? "",
  };
}

export function AssessmentListeningItemMatchPartEditor({
  part,
  onChange,
}: Props) {
  const { audioText, audioUrl, choices, prompts } = part.activity;
  const [choiceIndex, setChoiceIndex] = useAuthoringItemIndex(
    choices.length,
    `${part.id}-choice`,
  );
  const [promptIndex, setPromptIndex] = useAuthoringItemIndex(
    prompts.length,
    `${part.id}-prompt`,
  );
  const choice = choices[choiceIndex];
  const prompt = prompts[promptIndex];

  const patchActivity = (
    updater: (activity: ItemMatchPart["activity"]) => ItemMatchPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={prompts.length}
        index={promptIndex}
        onIndexChange={setPromptIndex}
        label="Prompt"
        itemLabels={prompts.map((row) => row.label.trim() || "Prompt")}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            prompts: [...activity.prompts, emptyPrompt(activity.choices)],
          }));
          setPromptIndex(prompts.length);
        }}
        onRemove={() => {
          if (prompts.length <= 1 || !prompt) return;
          patchActivity((activity) => ({
            ...activity,
            prompts: activity.prompts.filter((row) => row.id !== prompt.id),
          }));
          setPromptIndex(Math.max(0, promptIndex - 1));
        }}
      >
        {prompt ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Person / prompt
              <input
                value={prompt.label}
                onChange={(event) => {
                  const label = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    prompts: activity.prompts.map((row) =>
                      row.id === prompt.id ? { ...row, label } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Correct choice
              <select
                value={prompt.correctChoiceId}
                onChange={(event) => {
                  const correctChoiceId = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    prompts: activity.prompts.map((row) =>
                      row.id === prompt.id
                        ? { ...row, correctChoiceId }
                        : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              >
                <option value="">Choose…</option>
                {choices.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Listening setup" defaultOpen={false}>
        <AssessmentListeningAudioFields
          audioText={audioText}
          audioUrl={audioUrl}
          onChange={(next) =>
            patchActivity((activity) => ({
              ...activity,
              audioText: next.audioText,
              ...(next.audioUrl
                ? { audioUrl: next.audioUrl }
                : { audioUrl: undefined }),
            }))
          }
        />
      </AssessmentInspectorSection>

      <AssessmentInspectorSection title="Choice bank" defaultOpen={false}>
        <AuthoringItemPager
          count={choices.length}
          index={choiceIndex}
          onIndexChange={setChoiceIndex}
          label="Choice"
          itemLabels={choices.map((row) => row.label.trim() || "Choice")}
          minCount={2}
          maxCount={12}
          onAdd={() => {
            patchActivity((activity) => ({
              ...activity,
              choices: [...activity.choices, emptyChoice()],
            }));
            setChoiceIndex(choices.length);
          }}
          onRemove={() => {
            if (choices.length <= 2 || !choice) return;
            patchActivity((activity) => ({
              ...activity,
              choices: activity.choices.filter((row) => row.id !== choice.id),
              prompts: activity.prompts.map((row) =>
                row.correctChoiceId === choice.id
                  ? {
                      ...row,
                      correctChoiceId:
                        activity.choices.find((item) => item.id !== choice.id)
                          ?.id ?? "",
                    }
                  : row,
              ),
            }));
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
                    patchActivity((activity) => ({
                      ...activity,
                      choices: activity.choices.map((row) =>
                        row.id === choice.id ? { ...row, label } : row,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                />
              </label>
              <MediaUrlControls
                label="Optional image"
                value={choice.imageSrc ?? ""}
                compact
                onChange={(url) =>
                  patchActivity((activity) => ({
                    ...activity,
                    choices: activity.choices.map((row) =>
                      row.id === choice.id
                        ? { ...row, imageSrc: url || undefined }
                        : row,
                    ),
                  }))
                }
              />
            </div>
          ) : null}
        </AuthoringItemPager>
      </AssessmentInspectorSection>
    </div>
  );
}
