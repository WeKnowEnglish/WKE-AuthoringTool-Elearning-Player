"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DocumentLaunchPanel } from "@/components/document-activity/DocumentLaunchPanel";
import { WhiteboardLaunchPanel } from "@/components/pilots/whiteboard/WhiteboardLaunchPanel";
import { WordCardsLaunchPanel } from "@/components/word-cards/WordCardsLaunchPanel";
import {
  defaultConfigForKind,
  normalizeStepConfig,
  stepTitleFromConfig,
} from "@/lib/class-lessons/normalize";
import type {
  ClassLessonPhase,
  ClassLessonStep,
  ClassLessonStepKind,
  CustomLessonStepConfig,
  LiveGameLessonStepConfig,
  LiveGameQuestionSetOption,
  StudioActivityLessonStepConfig,
  StudioActivityOption,
} from "@/lib/class-lessons/types";
import {
  CLASS_LESSON_PHASE_LABELS,
  CLASS_LESSON_PHASES,
  CLASS_LESSON_STEP_KIND_LABELS,
} from "@/lib/class-lessons/types";

type DraftStep = Omit<ClassLessonStep, "position">;

type Props = {
  step: DraftStep | null;
  kind: ClassLessonStepKind;
  liveGameSets: LiveGameQuestionSetOption[];
  studioActivities: StudioActivityOption[];
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

function defaultPhaseForKind(kind: ClassLessonStepKind): ClassLessonPhase {
  if (kind === "custom") return "custom";
  return "guided_practice";
}

export function ClassLessonStepEditor({
  step,
  kind,
  liveGameSets,
  studioActivities,
  onCancel,
  onSave,
}: Props) {
  const router = useRouter();
  const initialConfig = step?.kind === kind ? step.config : defaultConfigForKind(kind);
  const initialSuggestedTitle = step?.title ?? stepTitleFromConfig(kind, initialConfig);
  const [title, setTitle] = useState(initialSuggestedTitle);
  const [phase, setPhase] = useState<ClassLessonPhase>(
    step?.phase ?? defaultPhaseForKind(kind),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    step?.durationMinutes ?? 5,
  );
  const [teacherAction, setTeacherAction] = useState(step?.teacherAction ?? "");
  const [studentAction, setStudentAction] = useState(step?.studentAction ?? "");
  const [materialNote, setMaterialNote] = useState(
    kind === "custom"
      ? (normalizeStepConfig("custom", initialConfig) as CustomLessonStepConfig)
          .materialNote
      : "",
  );

  const withPlanning = (base: {
    kind: ClassLessonStepKind;
    title: string;
    config: DraftStep["config"];
  }): DraftStep => ({
    id: step?.id ?? newStepId(),
    kind: base.kind,
    title:
      !step && title.trim() === initialSuggestedTitle.trim()
        ? base.title
        : title.trim() || base.title,
    phase,
    durationMinutes,
    teacherAction: teacherAction.trim(),
    studentAction: studentAction.trim(),
    config: base.config,
  });

  const planningFields = (
    <StepPlanningFields
      title={title}
      phase={phase}
      durationMinutes={durationMinutes}
      teacherAction={teacherAction}
      studentAction={studentAction}
      onTitleChange={setTitle}
      onPhaseChange={setPhase}
      onDurationChange={setDurationMinutes}
      onTeacherActionChange={setTeacherAction}
      onStudentActionChange={setStudentAction}
    />
  );

  if (kind === "custom") {
    return (
      <div className="space-y-4">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        {planningFields}
        <label className="block text-sm font-semibold text-neutral-800">
          Materials needed <span className="font-normal text-neutral-500">(optional)</span>
          <input
            type="text"
            value={materialNote}
            onChange={(event) => setMaterialNote(event.target.value)}
            placeholder="Textbook page, picture cards, real objects…"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>
        <MaterialBuilderLinks />
        <button
          type="button"
          onClick={() => {
            const nextConfig = normalizeStepConfig("custom", { materialNote });
            onSave(
              withPlanning({
                kind: "custom",
                title: title.trim() || "Teaching step",
                config: nextConfig,
              }),
            );
          }}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
        >
          {step ? "Update step" : "Add teaching step"}
        </button>
      </div>
    );
  }

  if (kind === "whiteboard") {
    return (
      <div className="space-y-4">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        {planningFields}
        <WhiteboardLaunchPanel
          busy={false}
          initial={initialConfig as never}
          submitLabel={step ? "Update step" : "Add whiteboard step"}
          onLaunch={(payload) => {
            const config = normalizeStepConfig("whiteboard", payload);
            onSave(
              withPlanning({
                kind: "whiteboard",
                title: stepTitleFromConfig("whiteboard", config),
                config,
              }),
            );
          }}
        />
      </div>
    );
  }

  if (kind === "document") {
    return (
      <div className="space-y-4">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        {planningFields}
        <DocumentLaunchPanel
          busy={false}
          initial={initialConfig as never}
          submitLabel={step ? "Update step" : "Add document step"}
          onLaunch={(payload) => {
            const config = normalizeStepConfig("document", payload);
            onSave(
              withPlanning({
                kind: "document",
                title: stepTitleFromConfig("document", config),
                config,
              }),
            );
          }}
        />
      </div>
    );
  }

  if (kind === "word_cards") {
    return (
      <div className="space-y-4">
        <StepEditorChrome kind={kind} onCancel={onCancel} />
        {planningFields}
        <WordCardsLaunchPanel
          busy={false}
          initial={initialConfig as never}
          submitLabel={step ? "Update step" : "Add word cards step"}
          onLaunch={(payload) => {
            const config = normalizeStepConfig("word_cards", payload);
            onSave(
              withPlanning({
                kind: "word_cards",
                title: stepTitleFromConfig("word_cards", config),
                config,
              }),
            );
          }}
        />
      </div>
    );
  }

  if (kind === "studio_activity") {
    return (
      <StudioActivityStepEditor
        step={step}
        planningFields={planningFields}
        activities={studioActivities}
        onCancel={onCancel}
        onRefresh={() => router.refresh()}
        onChoose={(activity) => {
          const config = normalizeStepConfig("studio_activity", {
            activityId: activity.id,
            activityTitle: activity.title,
            format: activity.format,
            playPath: activity.playPath,
          }) as StudioActivityLessonStepConfig;
          onSave(
            withPlanning({
              kind: "studio_activity",
              title: activity.title,
              config,
            }),
          );
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <StepEditorChrome kind="live_game" onCancel={onCancel} />
      {planningFields}
      <LiveGameStepEditor
        step={step}
        initial={initialConfig as LiveGameLessonStepConfig}
        liveGameSets={liveGameSets}
        onChoose={(config) =>
          onSave(
            withPlanning({
              kind: "live_game",
              title: stepTitleFromConfig("live_game", config),
              config,
            }),
          )
        }
      />
    </div>
  );
}

function StepPlanningFields(props: {
  title: string;
  phase: ClassLessonPhase;
  durationMinutes: number;
  teacherAction: string;
  studentAction: string;
  onTitleChange: (value: string) => void;
  onPhaseChange: (value: ClassLessonPhase) => void;
  onDurationChange: (value: number) => void;
  onTeacherActionChange: (value: string) => void;
  onStudentActionChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-neutral-800 sm:col-span-2">
        Step title
        <input
          type="text"
          value={props.title}
          onChange={(event) => props.onTitleChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold text-neutral-800">
        Lesson phase
        <select
          value={props.phase}
          onChange={(event) => props.onPhaseChange(event.target.value as ClassLessonPhase)}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        >
          {CLASS_LESSON_PHASES.map((phase) => (
            <option key={phase} value={phase}>
              {CLASS_LESSON_PHASE_LABELS[phase]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-neutral-800">
        Minutes
        <input
          type="number"
          min={1}
          max={120}
          value={props.durationMinutes}
          onChange={(event) =>
            props.onDurationChange(
              Math.min(120, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
            )
          }
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold text-neutral-800 sm:col-span-2">
        What will students do?
        <textarea
          value={props.studentAction}
          onChange={(event) => props.onStudentActionChange(event.target.value)}
          rows={2}
          placeholder="Use the target language to interview a partner."
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold text-neutral-800 sm:col-span-2">
        Teacher cue <span className="font-normal text-neutral-500">(optional)</span>
        <textarea
          value={props.teacherAction}
          onChange={(event) => props.onTeacherActionChange(event.target.value)}
          rows={2}
          placeholder="Model one example, monitor, then give brief feedback."
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        />
      </label>
    </div>
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

function MaterialBuilderLinks() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Need a digital material?
      </p>
      <p className="mt-1 text-xs text-neutral-600">
        Create it in a new tab, save it to My Activity Bank, then attach it as an Activity Bank
        step in this lesson.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href="/teacher/activity-builder"
          target="_blank"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800"
        >
          Create material ↗
        </Link>
        <Link
          href="/teacher/activity-builder/library"
          target="_blank"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800"
        >
          Browse WKE Library ↗
        </Link>
      </div>
    </div>
  );
}

function StudioActivityStepEditor({
  step,
  planningFields,
  activities,
  onCancel,
  onRefresh,
  onChoose,
}: {
  step: DraftStep | null;
  planningFields: React.ReactNode;
  activities: StudioActivityOption[];
  onCancel: () => void;
  onRefresh: () => void;
  onChoose: (activity: StudioActivityOption) => void;
}) {
  const selectedId =
    step?.kind === "studio_activity"
      ? (step.config as StudioActivityLessonStepConfig).activityId
      : "";
  return (
    <div className="space-y-4">
      <StepEditorChrome kind="studio_activity" onCancel={onCancel} />
      {planningFields}
      <MaterialBuilderLinks />
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800"
      >
        Refresh Activity Bank
      </button>
      {activities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-4 text-sm text-neutral-600">
          Your Activity Bank is empty. Create a material first, then reopen this lesson to attach
          it.
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {activities.map((activity) => (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => onChoose(activity)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  selectedId === activity.id
                    ? "border-teal-700 bg-teal-50"
                    : "border-neutral-200 bg-white hover:border-teal-400"
                }`}
              >
                <span className="font-semibold text-neutral-900">{activity.title}</span>
                <span className="mt-0.5 block text-xs capitalize text-neutral-500">
                  {activity.format.replaceAll("_", " ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveGameStepEditor({
  step,
  initial,
  liveGameSets,
  onChoose,
}: {
  step: DraftStep | null;
  initial: LiveGameLessonStepConfig;
  liveGameSets: LiveGameQuestionSetOption[];
  onChoose: (config: LiveGameLessonStepConfig) => void;
}) {
  const selectedId = initial.questionSetId;
  return (
    <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
      <p className="text-sm text-neutral-600">
        Choose a published question set. You can launch it from Virtual Classroom later.
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
                  onClick={() =>
                    onChoose(
                      normalizeStepConfig("live_game", {
                        questionSetId: set.id,
                        questionSetTitle: set.title,
                        questionSetSlug: set.slug,
                        level: set.level,
                      }) as LiveGameLessonStepConfig,
                    )
                  }
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
      {step ? (
        <p className="text-xs text-neutral-500">
          Choosing a set updates this lesson step immediately.
        </p>
      ) : null}
    </div>
  );
}
