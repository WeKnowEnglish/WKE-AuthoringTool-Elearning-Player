"use client";

import Link from "next/link";
import { useRef, useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { saveCourseMap } from "@/lib/actions/course-map";
import {
  activeLessons,
  blankCourse,
  MAP_PATH,
  type CourseMap,
} from "@/lib/course-map/model";

const subscribeHydration = () => () => {};
export function CourseMapIndex({
  maps,
  classId,
}: {
  maps: CourseMap[];
  classId?: string;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, startTransition] = useTransition();
  const creationId = useRef<string | null>(null);
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-800">
          Libraries · Curriculum planning
        </p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-950">Course map</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">
          Build the learning progression, link trusted materials, and turn a
          planned lesson into a class lesson. Start with a small unit and fill
          out the sequence as it develops.
        </p>
      </header>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          creationId.current ??= crypto.randomUUID();
          startTransition(async () => {
            try {
              const result = await saveCourseMap({
                id: creationId.current!,
                expectedRevision: 0,
                document: blankCourse(title.trim()),
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push(
                `${MAP_PATH}/${result.map.id}${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`,
              );
            } catch {
              setError(
                "Connection interrupted. Retry, or refresh to recover your saved course.",
              );
            }
          });
        }}
      >
        <label className="min-w-48 flex-1 text-sm font-semibold">
          Course title
          <input
            className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Primary English · Level 1"
            required
            disabled={busy || !hydrated}
          />
        </label>
        <button
          className="rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={busy || !hydrated}
        >
          {busy ? "Creating…" : "Create course map"}
        </button>
        {error && (
          <p role="alert" className="w-full text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Your course maps</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Search courses by title, learners, grade or CEFR
        <input
          className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Primary / Grade 3 / A1"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        {maps
          .filter(
            (m) =>
              (showArchived || !m.archived) &&
              [
                m.document.title,
                m.document.audience,
                m.document.gradeRange,
                m.document.cefr,
              ]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((map) => {
            const lessons = activeLessons(map.document);
            return (
              <Link
                key={map.id}
                href={`${MAP_PATH}/${map.id}${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`}
                className="rounded-xl border bg-white p-5 shadow-sm hover:border-teal-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">{map.document.title}</h3>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">
                    {map.archived ? "Archived" : `Draft · v${map.revision}`}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {[
                    map.document.audience,
                    map.document.gradeRange,
                    map.document.cefr,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Add learners and level"}
                </p>
                <p className="mt-4 text-sm">
                  {map.document.units.filter((u) => !u.archived).length} units ·{" "}
                  {lessons.length} planned lessons ·{" "}
                  {map.document.targets.length} targets
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Saved {new Date(map.updatedAt).toLocaleDateString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })}
                </p>
              </Link>
            );
          })}
      </div>
      {!maps.some((m) => showArchived || !m.archived) && (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-600">
          Create your first course map above. You can save a skeleton before
          adding objectives and materials.
        </p>
      )}
    </div>
  );
}
