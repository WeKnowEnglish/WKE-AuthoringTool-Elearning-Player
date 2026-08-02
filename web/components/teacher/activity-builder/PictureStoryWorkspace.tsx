"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createSamplePictureStoryDocument,
  pictureStoryStubPack,
  validatePictureStoryDocument,
  type PictureStoryDocument,
} from "@/lib/picture-story";

export function PictureStoryWorkspace() {
  const [document, setDocument] = useState<PictureStoryDocument>(() =>
    createSamplePictureStoryDocument(),
  );
  const [activityId, setActivityId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const saveToBank = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const valid = validatePictureStoryDocument(document);
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activityId,
          format: "picture_story",
          pack: pictureStoryStubPack(valid),
          authoring: valid,
          title: valid.title,
          filename: `${valid.id}.picture-story.json`,
          source: {
            via: "picture_story_workspace",
            frameCount: valid.frames.length,
            questionCount: valid.questions.length,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        playPath?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.id) {
        throw new Error(
          payload?.error ||
            `Save failed (${response.status}). Apply migration 097 if picture_story is rejected.`,
        );
      }
      setActivityId(payload.id);
      setDocument(valid);
      setBanner(
        payload.playPath
          ? `Saved to Activity Bank. Play: ${payload.playPath}`
          : "Saved to Activity Bank.",
      );
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Homework module · Reading
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Picture story</h1>
        <p className="mt-1 text-sm text-stone-600">
          Author picture frames plus comprehension questions, save to Activity Bank, then
          assign as homework. Students play a dedicated shell (not Lesson Player). Start
          from the sample.
        </p>
      </header>

      {banner ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
          {banner}
        </p>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Starter</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setDocument(createSamplePictureStoryDocument());
            setActivityId(null);
            setBanner("Loaded Mia's Little Seed sample.");
          }}
          className="mt-3 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
        >
          Load sample
        </button>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Activity</h2>
        <label className="mt-3 block text-xs text-stone-600">
          Title
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            value={document.title}
            onChange={(event) =>
              setDocument((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        <label className="mt-3 block text-xs text-stone-600">
          Instructions
          <textarea
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            rows={2}
            value={document.instructions}
            onChange={(event) =>
              setDocument((current) => ({
                ...current,
                instructions: event.target.value,
              }))
            }
          />
        </label>
        <p className="mt-3 text-xs text-stone-500">
          {document.frames.length} frame{document.frames.length === 1 ? "" : "s"} ·{" "}
          {document.questions.length} question
          {document.questions.length === 1 ? "" : "s"}
          {document.allowStoryReviewDuringQuestions
            ? " · story review during questions"
            : ""}
        </p>
        <ul className="mt-2 space-y-2 text-xs text-stone-700">
          {document.frames.map((frame, index) => (
            <li key={frame.id}>
              <span className="font-semibold">Frame {index + 1}</span> {frame.imageAlt}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2 text-xs text-stone-700">
          {document.questions.map((question, index) => (
            <li key={question.id}>
              <span className="font-semibold">Q{index + 1}</span> ({question.type}){" "}
              {question.prompt}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveToBank()}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {activityId ? "Update in bank" : "Save to Activity Bank"}
          </button>
          {activityId ? (
            <Link
              href={`/pilots/picture-story?activity=${encodeURIComponent(activityId)}`}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
            >
              Play pilot
            </Link>
          ) : (
            <Link
              href="/pilots/picture-story"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
            >
              Open pilot sample
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
