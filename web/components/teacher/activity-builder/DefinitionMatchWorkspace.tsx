"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  compileDefinitionMatchFromVocabList,
  createSampleDefinitionMatchDocument,
  definitionMatchStubPack,
  validateDefinitionMatchDocument,
  type DefinitionMatchDocument,
} from "@/lib/definition-match";
import {
  getStudioVocabularyList,
  listStudioVocabularyLists,
  type StudioVocabularyListRef,
} from "@/lib/activity-library";
import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";

export function DefinitionMatchWorkspace() {
  const [document, setDocument] = useState<DefinitionMatchDocument>(() =>
    createSampleDefinitionMatchDocument(),
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
      const next = compileDefinitionMatchFromVocabList({ list, maxPairs: 8 });
      setDocument(next);
      setActivityId(null);
      setBanner(
        selectedListId
          ? `Generated ${next.pairs.length} pairs from bank list.`
          : `Generated ${next.pairs.length} pairs from hobbies sample list.`,
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
      const valid = validateDefinitionMatchDocument(document);
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activityId,
          format: "definition_match",
          pack: definitionMatchStubPack(valid),
          authoring: valid,
          title: valid.title,
          filename: `${valid.id}.definition-match.json`,
          source: {
            via: "definition_match_workspace",
            pairCount: valid.pairs.length,
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
            `Save failed (${response.status}). Apply migration 095 if definition_match is rejected.`,
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
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Definition match</h1>
        <p className="mt-1 text-sm text-stone-600">
          Generate word–definition pairs from a vocabulary list (needs English definitions),
          save to Activity Bank, then assign as homework. Students play a dedicated match
          shell (not Lesson Player).
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
              setDocument(createSampleDefinitionMatchDocument());
              setActivityId(null);
              setBanner("Loaded definition match sample.");
            }}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
          >
            Load sample
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
          {document.pairs.length} pair{document.pairs.length === 1 ? "" : "s"}
          {document.shuffleWords ? " · shuffled word bank" : ""}
        </p>
        <ul className="mt-2 space-y-2 text-xs text-stone-700">
          {document.pairs.map((pair, index) => (
            <li key={pair.id}>
              <span className="font-semibold">#{index + 1}</span> {pair.word}
              <span className="mt-0.5 block text-stone-500">{pair.definition}</span>
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
              href={`/pilots/definition-match?activity=${encodeURIComponent(activityId)}`}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
            >
              Play pilot
            </Link>
          ) : (
            <Link
              href="/pilots/definition-match"
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
