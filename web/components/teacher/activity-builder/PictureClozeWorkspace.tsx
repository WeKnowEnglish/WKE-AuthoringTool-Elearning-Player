"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  compilePictureClozeFromVocabList,
  createSamplePictureClozeDocument,
  pictureClozeStubPack,
  validatePictureClozeDocument,
  type PictureClozeDocument,
} from "@/lib/picture-cloze";
import {
  getStudioVocabularyList,
  listStudioVocabularyLists,
  type StudioVocabularyListRef,
} from "@/lib/activity-library";
import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";

export function PictureClozeWorkspace() {
  const [document, setDocument] = useState<PictureClozeDocument>(() =>
    createSamplePictureClozeDocument(),
  );
  const [activityId, setActivityId] = useState<string | null>(null);
  const [vocabLists, setVocabLists] = useState<StudioVocabularyListRef[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    void listStudioVocabularyLists()
      .then(setVocabLists)
      .catch(() => setVocabLists([]));
  }, []);

  const generateFromList = async () => {
    setBusy(true);
    setBanner(null);
    try {
      let list;
      if (selectedListId) {
        const loaded = await getStudioVocabularyList(selectedListId);
        list = loaded.document;
      } else {
        list = createHobbiesVocabularyListDocument();
      }
      const next = compilePictureClozeFromVocabList({ list, maxItems: 6 });
      setDocument(next);
      setActivityId(null);
      setBanner(
        selectedListId
          ? `Generated ${next.items.length} items from bank list.`
          : `Generated ${next.items.length} items from hobbies sample list.`,
      );
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not generate.");
    } finally {
      setBusy(false);
    }
  };

  const saveToBank = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const valid = validatePictureClozeDocument(document);
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activityId,
          format: "picture_cloze",
          pack: pictureClozeStubPack(valid),
          authoring: valid,
          title: valid.title,
          filename: `${valid.id}.picture-cloze.json`,
          source: { via: "picture_cloze_workspace", itemCount: valid.items.length },
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
            `Save failed (${response.status}). Apply migration 089 if picture_cloze is rejected.`,
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
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Picture cloze</h1>
        <p className="mt-1 text-sm text-stone-600">
          Generate from a vocabulary list, save to Activity Bank, then assign as homework.
          Students play a dedicated cloze shell (not Lesson Player).
        </p>
      </header>

      {banner ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
          {banner}
        </p>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Generate</h2>
        <label className="mt-3 block text-xs text-stone-600">
          Vocabulary list (optional — hobbies sample if empty)
          <select
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            value={selectedListId}
            onChange={(event) => setSelectedListId(event.target.value)}
          >
            <option value="">Hobbies sample (built-in)</option>
            {vocabLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generateFromList()}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate from list
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDocument(createSamplePictureClozeDocument());
              setActivityId(null);
              setBanner("Loaded tools sample (Homework Template One Part 1).");
            }}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
          >
            Load tools sample
          </button>
        </div>
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
          {document.items.length} item{document.items.length === 1 ? "" : "s"} · word bank:{" "}
          {document.wordBank.join(", ")}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-stone-700">
          {document.items.map((item) => (
            <li key={item.id}>
              {item.sentenceBefore}
              <strong>___</strong>
              {item.sentenceAfter} → {item.acceptedAnswers[0]}
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
              href={`/pilots/picture-cloze?activity=${encodeURIComponent(activityId)}`}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
            >
              Play pilot
            </Link>
          ) : (
            <Link
              href="/pilots/picture-cloze"
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
