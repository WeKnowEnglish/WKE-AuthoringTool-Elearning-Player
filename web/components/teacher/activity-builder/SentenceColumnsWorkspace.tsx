"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createSampleSentenceColumnsDocument,
  validateSentenceColumnsDocument,
  sentenceColumnsStubPack,
  type SentenceColumnsDocument,
} from "@/lib/sentence-columns";

export function SentenceColumnsWorkspace() {
  const [document, setDocument] = useState<SentenceColumnsDocument>(() =>
    createSampleSentenceColumnsDocument(),
  );
  const [activityId, setActivityId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const saveToBank = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const valid = validateSentenceColumnsDocument(document);
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activityId,
          format: "sentence_columns",
          pack: sentenceColumnsStubPack(valid),
          authoring: valid,
          title: valid.title,
          filename: `${valid.id}.sentence-columns.json`,
          source: {
            via: "sentence_columns_workspace",
            challengeCount: valid.challenges.length,
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
            `Save failed (${response.status}). Apply migration 091 if sentence_columns is rejected.`,
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
          Homework module
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Sentence columns</h1>
        <p className="mt-1 text-sm text-stone-600">
          Author Who / Action / Extra challenges, save to Activity Bank, then assign as
          homework. Students play a dedicated placement shell (not Lesson Player).
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
            setDocument(createSampleSentenceColumnsDocument());
            setActivityId(null);
            setBanner("Loaded Homework Template One Part 3 sample.");
          }}
          className="mt-3 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
        >
          Load HT1 sample
        </button>
        <p className="mt-2 text-xs text-stone-500">
          Vocab-list auto-compile is out of scope for this slice — edit challenges below or
          start from the sample.
        </p>
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
          {document.challenges.length} sentence
          {document.challenges.length === 1 ? "" : "s"}
        </p>
        <ul className="mt-2 space-y-2 text-xs text-stone-700">
          {document.challenges.map((challenge, index) => {
            const ordered = document.columns.map(
              (column) =>
                challenge.pieces.find((piece) => piece.columnId === column.id)?.text ??
                "?",
            );
            return (
              <li key={challenge.id}>
                <span className="font-semibold">#{index + 1}</span> {ordered.join(" · ")}
              </li>
            );
          })}
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
              href={`/pilots/sentence-columns?activity=${encodeURIComponent(activityId)}`}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
            >
              Play pilot
            </Link>
          ) : (
            <Link
              href="/pilots/sentence-columns"
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
