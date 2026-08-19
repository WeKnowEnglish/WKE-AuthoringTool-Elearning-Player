"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ACTIVITY_TRACK_MODE_COPY,
  createEmptyActivityTrack,
  persistActivityTrackDraft,
  seedAssessmentFromTemplate,
  seedBlankGradedCollection,
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
  const [blankLevel, setBlankLevel] = useState<"primary" | "secondary" | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Track builder
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-stone-900">New track</h1>
        <p className="mt-1 text-sm text-stone-600">
          Practice uses the Learning Track compiler. Graded builds reusable homework collections.
          Assessment clones the Primary A2 Reading & Writing paper (Flyers-shaped;
          Listening/Speaking skipped for now).
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
                if (option !== "graded") {
                  setTemplateId(null);
                  setBlankLevel(null);
                }
                if (option === "assessment" && !title.trim()) {
                  setTitle("Primary A2 Reading & Writing");
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
          <p className="text-sm font-bold text-stone-800">Choose a starting point</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["primary", "secondary"] as const).map((level) => (
              <button
                key={`blank-${level}`}
                type="button"
                onClick={() => {
                  setBlankLevel(level);
                  setTemplateId(null);
                  if (!title.trim()) setTitle(`${level === "primary" ? "Primary" : "Secondary"} homework collection`);
                }}
                className={`rounded-xl border-2 p-3 text-left ${
                  blankLevel === level
                    ? "border-teal-600 bg-teal-50"
                    : "border-stone-200 bg-white hover:border-stone-400"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  {level} · blank
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-stone-900">
                  Homework collection
                </p>
                <p className="mt-1 text-[11px] font-semibold text-stone-600">
                  Add any supported homework type in the order you want.
                </p>
              </button>
            ))}
          </div>
          <p className="pt-2 text-xs font-bold uppercase tracking-wide text-stone-500">
            Or use a preset
          </p>
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
                    setBlankLevel(null);
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
          Starts from Reading & Writing only (7 Flyers-shaped parts, ~45 min). Edit
          content in the compiler, preview live, then Assign to freeze for a class.
          Prefer this over the Class Hub “Primary A2 assessment” shortcut, which still
          points at the full Listening + Speaking fixture.
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
          disabled={creating}
          onClick={() => {
            if (!mode) {
              setError("Pick Practice, Graded, or Assessment first.");
              return;
            }
            if (!title.trim()) {
              setError("Add a title.");
              return;
            }
            if (mode === "graded" && !templateId && !blankLevel) {
              setError("Choose a blank collection or a homework preset.");
              return;
            }
            setCreating(true);
            setError(null);
            void (async () => {
              try {
                let doc;
                if (mode === "graded") {
                  const trackId = crypto.randomUUID();
                  doc = templateId
                    ? seedGradedFromTemplate({ trackId, title, templateId })
                    : seedBlankGradedCollection({ trackId, title, level: blankLevel! });
                } else if (mode === "assessment") {
                  const trackId = crypto.randomUUID();
                  doc = seedAssessmentFromTemplate({ trackId, title });
                } else {
                  doc = createEmptyActivityTrack({ mode, title });
                }
                const { cloudSaved } = await persistActivityTrackDraft(doc);
                if (!cloudSaved) {
                  setError(
                    "Track saved locally but could not reach your account. Check your connection and try again.",
                  );
                  setCreating(false);
                  return;
                }
                router.push(`/teacher/activity-builder/tracks/${doc.id}`);
              } catch {
                setError("Could not create track. Try again.");
                setCreating(false);
              }
            })();
          }}
          className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create track"}
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
