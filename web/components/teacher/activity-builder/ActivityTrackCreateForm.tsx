"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ACTIVITY_TRACK_MODE_COPY,
  createEmptyActivityTrack,
  saveActivityTrackDraft,
  seedAssessmentFromTemplate,
  seedGradedFromTemplate,
  type ActivityTrackMode,
  type GradedTemplateChoice,
} from "@/lib/activity-tracks";
import {
  getHomeworkTemplateDefinition,
  HOMEWORK_TEMPLATE_IDS,
} from "@/lib/homework-templates/registry";

const MODES: ActivityTrackMode[] = ["practice", "graded", "assessment"];

function modeSelectedClass(mode: ActivityTrackMode): string {
  if (mode === "graded") return "border-amber-500 bg-amber-50";
  if (mode === "assessment") return "border-violet-500 bg-violet-50";
  return "border-sky-500 bg-sky-50";
}

export function ActivityTrackCreateForm() {
  const router = useRouter();
  const [mode, setMode] = useState<ActivityTrackMode | null>(null);
  const [templateId, setTemplateId] = useState<GradedTemplateChoice | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Track builder
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-stone-900">New track</h1>
        <p className="mt-1 text-sm text-stone-600">
          Practice uses the Learning Track compiler. Graded clones homework templates.
          Assessment clones the Primary A2 English Check (free nav, results after submit).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((option) => {
          const copy = ACTIVITY_TRACK_MODE_COPY[option];
          const selected = mode === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                if (option !== "graded") setTemplateId(null);
                if (option === "assessment" && !title.trim()) {
                  setTitle("Primary A2 English Check");
                }
              }}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                selected
                  ? modeSelectedClass(option)
                  : "border-stone-200 bg-white hover:border-stone-400"
              }`}
            >
              <p className="text-sm font-extrabold text-stone-900">{copy.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-stone-600">
                {copy.blurb}
              </p>
            </button>
          );
        })}
      </div>

      {mode === "graded" ? (
        <div className="space-y-2">
          <p className="text-sm font-bold text-stone-800">Start from template</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {HOMEWORK_TEMPLATE_IDS.map((id) => {
              const definition = getHomeworkTemplateDefinition(id)!;
              const selected = templateId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTemplateId(id);
                    if (!title.trim()) setTitle(definition.title);
                  }}
                  className={`rounded-xl border-2 p-3 text-left ${
                    selected
                      ? "border-amber-500 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                    {definition.level}
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-stone-900">
                    {definition.title}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-stone-600">
                    {definition.sectionCount} parts · {definition.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode === "assessment" ? (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold leading-5 text-violet-950">
          Starts from the Primary A2 English Check (Listening, Reading & Writing,
          Speaking). You can edit every part, preview live, then freeze on Assign.
        </p>
      ) : null}

      <label className="block text-sm font-bold text-stone-800">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Chapter 1 tools practice"
          className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none focus:border-stone-500"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (!mode) {
              setError("Pick Practice, Graded, or Assessment first.");
              return;
            }
            if (!title.trim()) {
              setError("Add a title.");
              return;
            }
            if (mode === "graded") {
              if (!templateId) {
                setError("Pick a homework template to clone.");
                return;
              }
              const trackId = crypto.randomUUID();
              const doc = seedGradedFromTemplate({
                trackId,
                title,
                templateId,
              });
              saveActivityTrackDraft(doc);
              router.push(`/teacher/activity-builder/tracks/${doc.id}`);
              return;
            }
            if (mode === "assessment") {
              const trackId = crypto.randomUUID();
              const doc = seedAssessmentFromTemplate({ trackId, title });
              saveActivityTrackDraft(doc);
              router.push(`/teacher/activity-builder/tracks/${doc.id}`);
              return;
            }
            const doc = createEmptyActivityTrack({ mode, title });
            saveActivityTrackDraft(doc);
            router.push(`/teacher/activity-builder/tracks/${doc.id}`);
          }}
          className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white hover:bg-stone-800"
        >
          Create track
        </button>
        <button
          type="button"
          onClick={() => router.push("/teacher/activity-builder/tracks")}
          className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
