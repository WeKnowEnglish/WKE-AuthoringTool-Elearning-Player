"use client";

import { DocumentLaunchPanel } from "@/components/document-activity/DocumentLaunchPanel";
import { WhiteboardLaunchPanel } from "@/components/pilots/whiteboard/WhiteboardLaunchPanel";
import { WordCardsLaunchPanel } from "@/components/word-cards/WordCardsLaunchPanel";
import {
  defaultConfigForKind,
  normalizeStepConfig,
  stepTitleFromConfig,
} from "@/lib/class-lessons/normalize";
import type {
  ClassLessonStep,
  ClassLessonStepKind,
  LiveGameLessonStepConfig,
  LiveGameQuestionSetOption,
} from "@/lib/class-lessons/types";
import { CLASS_LESSON_STEP_KIND_LABELS } from "@/lib/class-lessons/types";

type DraftStep = Omit<ClassLessonStep, "position">;

type Props = {
  step: DraftStep | null;
  kind: ClassLessonStepKind;
  liveGameSets: LiveGameQuestionSetOption[];
  onCancel: () => void;
  onSave: (step: DraftStep) => void;
};

function newStepId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function ClassLessonStepEditor({ step, kind, liveGameSets, onCancel, onSave }: Props) {
  const initialConfig = step?.kind === kind ? step.config : defaultConfigForKind(kind);

  if (kind === "whiteboard") {
    return (
      <div className="space-y-3">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        <WhiteboardLaunchPanel
          busy={false}
          initial={initialConfig as never}
          submitLabel={step ? "Update step" : "Add whiteboard step"}
          onLaunch={(payload) => {
            const config = normalizeStepConfig("whiteboard", payload);
            onSave({
              id: step?.id ?? newStepId(),
              kind: "whiteboard",
              title: stepTitleFromConfig("whiteboard", config),
              config,
            });
          }}
        />
      </div>
    );
  }

  if (kind === "document") {
    return (
      <div className="space-y-3">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        <DocumentLaunchPanel
          busy={false}
          initial={initialConfig as never}
          submitLabel={step ? "Update step" : "Add document step"}
          onLaunch={(payload) => {
            const config = normalizeStepConfig("document", payload);
            onSave({
              id: step?.id ?? newStepId(),
              kind: "document",
              title: stepTitleFromConfig("document", config),
              config,
            });
          }}
        />
      </div>
    );
  }

  if (kind === "word_cards") {
    return (
      <div className="space-y-3">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        <WordCardsLaunchPanel
          busy={false}
          initial={initialConfig as never}
          submitLabel={step ? "Update step" : "Add word cards step"}
          onLaunch={(payload) => {
            const config = normalizeStepConfig("word_cards", payload);
            onSave({
              id: step?.id ?? newStepId(),
              kind: "word_cards",
              title: stepTitleFromConfig("word_cards", config),
              config,
            });
          }}
        />
      </div>
    );
  }

  return (
    <LiveGameStepEditor
      step={step}
      initial={initialConfig as LiveGameLessonStepConfig}
      liveGameSets={liveGameSets}
      onCancel={onCancel}
      onSave={onSave}
    />
  );
}

function StepEditorChrome({
  kind,
  onCancel,
}: {
  kind: ClassLessonStepKind;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Step setup
        </p>
        <h3 className="text-lg font-bold text-neutral-900">
          {CLASS_LESSON_STEP_KIND_LABELS[kind]}
        </h3>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-neutral-200 px-2.5 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        Cancel
      </button>
    </div>
  );
}

function LiveGameStepEditor({
  step,
  initial,
  liveGameSets,
  onCancel,
  onSave,
}: {
  step: DraftStep | null;
  initial: LiveGameLessonStepConfig;
  liveGameSets: LiveGameQuestionSetOption[];
  onCancel: () => void;
  onSave: (step: DraftStep) => void;
}) {
  const selectedId = initial.questionSetId;

  return (
    <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
      <StepEditorChrome kind="live_game" onCancel={onCancel} />
      <p className="text-sm text-neutral-600">
        Choose a published question set to stage. You will host it live from Virtual Classroom
        (or Live Game host) in a later step.
      </p>
      {liveGameSets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-4 text-sm text-neutral-600">
          No published question sets available yet.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {liveGameSets.map((set) => {
            const selected = set.id === selectedId;
            return (
              <li key={set.id}>
                <button
                  type="button"
                  onClick={() => {
                    const config = normalizeStepConfig("live_game", {
                      questionSetId: set.id,
                      questionSetTitle: set.title,
                      questionSetSlug: set.slug,
                      level: set.level,
                    }) as LiveGameLessonStepConfig;
                    onSave({
                      id: step?.id ?? newStepId(),
                      kind: "live_game",
                      title: stepTitleFromConfig("live_game", config),
                      config,
                    });
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selected
                      ? "border-emerald-700 bg-emerald-100"
                      : "border-neutral-200 bg-white hover:border-emerald-400"
                  }`}
                >
                  <div className="font-semibold text-neutral-900">{set.title}</div>
                  <div className="mt-0.5 text-xs text-neutral-600">
                    {set.level} · {set.topic} · {set.questionCount} questions
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
