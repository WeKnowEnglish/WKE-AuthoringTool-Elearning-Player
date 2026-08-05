"use client";

import { useAuthoringItemIndex } from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentQuestionEditor } from "@/components/teacher/activity-builder/AssessmentQuestionEditor";
import { AssessmentListeningAudioFields } from "@/components/teacher/activity-builder/AssessmentListeningAudioFields";
import { splitAssessmentCsv } from "@/lib/activity-tracks/patch-assessment-part";
import type { AssessmentPart } from "@/lib/assessment/types";

type ListeningInformationPart = Extract<
  AssessmentPart,
  { kind: "listening_information" }
>;

type Props = {
  part: ListeningInformationPart;
  onChange: (next: ListeningInformationPart) => void;
};

function emptyField(): ListeningInformationPart["activity"]["fields"][number] {
  return {
    id: `field-${crypto.randomUUID().slice(0, 8)}`,
    label: "New field",
    acceptedAnswers: ["answer"],
  };
}

export function AssessmentListeningInformationPartEditor({
  part,
  onChange,
}: Props) {
  const { audioText, audioUrl, organizerTitle, fields } = part.activity;
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(fields.length, part.id);
  const field = fields[itemIndex];

  const patchActivity = (
    updater: (
      activity: ListeningInformationPart["activity"],
    ) => ListeningInformationPart["activity"],
  ) => onChange({ ...part, activity: updater(part.activity) });

  return (
    <div className="space-y-3">
      <AssessmentQuestionEditor
        count={fields.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label="Field"
        itemLabels={fields.map((row) => row.label.trim() || "Field")}
        minCount={1}
        maxCount={12}
        onAdd={() => {
          patchActivity((activity) => ({
            ...activity,
            fields: [...activity.fields, emptyField()],
          }));
          setItemIndex(fields.length);
        }}
        onRemove={() => {
          if (fields.length <= 1 || !field) return;
          patchActivity((activity) => ({
            ...activity,
            fields: activity.fields.filter((row) => row.id !== field.id),
          }));
          setItemIndex(Math.max(0, itemIndex - 1));
        }}
      >
        {field ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Field label
              <input
                value={field.label}
                onChange={(event) => {
                  const label = event.target.value;
                  patchActivity((activity) => ({
                    ...activity,
                    fields: activity.fields.map((row) =>
                      row.id === field.id ? { ...row, label } : row,
                    ),
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Accepted answers (comma or new line)
              <textarea
                value={field.acceptedAnswers.join(", ")}
                onChange={(event) => {
                  const acceptedAnswers = splitAssessmentCsv(event.target.value);
                  patchActivity((activity) => ({
                    ...activity,
                    fields: activity.fields.map((row) =>
                      row.id === field.id
                        ? {
                            ...row,
                            acceptedAnswers:
                              acceptedAnswers.length > 0
                                ? acceptedAnswers
                                : [""],
                          }
                        : row,
                    ),
                  }));
                }}
                rows={2}
                className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
              />
            </label>
          </div>
        ) : null}
      </AssessmentQuestionEditor>

      <AssessmentInspectorSection title="Listening setup" defaultOpen={false}>
        <label className="block text-[11px] font-bold text-stone-700">
          Organizer title
          <input
            value={organizerTitle}
            onChange={(event) =>
              patchActivity((activity) => ({
                ...activity,
                organizerTitle: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
          />
        </label>

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
    </div>
  );
}
