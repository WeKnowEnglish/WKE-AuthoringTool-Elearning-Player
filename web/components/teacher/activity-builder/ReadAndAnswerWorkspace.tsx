"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReadAndAnswerDocumentModuleEditor } from "@/components/teacher/activity-builder/ReadAndAnswerDocumentModuleEditor";
import {
  collectionPartFromReadingDocument,
  documentModuleValidationIssues,
} from "@/lib/homework-collections/document-module";
import { asReadAndAnswerDraft } from "@/lib/read-and-answer/draft";
import {
  createSampleReadAndAnswerDocument,
  readAndAnswerStubPack,
  validateReadAndAnswerDocument,
  type ReadAndAnswerDocument,
} from "@/lib/read-and-answer";
import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";

const WORKSPACE_PART_ID = "activity-bank-read-and-answer";

function documentFromPart(
  part: HomeworkCollectionDocumentModulePart,
): ReadAndAnswerDocument {
  return {
    ...asReadAndAnswerDraft(part.document),
    title: part.title,
    instructions: part.instructions,
  };
}

export function ReadAndAnswerWorkspace() {
  const [document, setDocument] = useState<ReadAndAnswerDocument>(() =>
    createSampleReadAndAnswerDocument(),
  );
  const [activityId, setActivityId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const part = useMemo(
    () =>
      collectionPartFromReadingDocument(
        "read_and_answer",
        document as unknown as Record<string, unknown>,
        WORKSPACE_PART_ID,
      ),
    [document],
  );
  const issues = documentModuleValidationIssues(part);

  const saveToBank = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const valid = validateReadAndAnswerDocument(document);
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activityId,
          format: "read_and_answer",
          pack: readAndAnswerStubPack(valid),
          authoring: valid,
          title: valid.title,
          filename: `${valid.id}.read-and-answer.json`,
          source: {
            via: "read_and_answer_workspace",
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
            `Save failed (${response.status}). Apply migration 097 if read_and_answer is rejected.`,
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
          Admin · Activity Bank
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Read and answer</h1>
        <p className="mt-1 text-sm text-stone-600">
          Author a short passage and questions, then save to Activity Bank. Teachers assign
          the same format from Graded Track Builder. This page stays admin-only.
        </p>
      </header>

      {banner ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
          {banner}
        </p>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <ReadAndAnswerDocumentModuleEditor
          part={part}
          showIdentityFields
          onChange={(nextPart) => {
            const next = documentFromPart(nextPart);
            if (next.id !== document.id) setActivityId(null);
            setDocument(next);
          }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || issues.length > 0}
            onClick={() => void saveToBank()}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {activityId ? "Update in bank" : "Save to Activity Bank"}
          </button>
          {activityId ? (
            <Link
              href={`/pilots/read-and-answer?activity=${encodeURIComponent(activityId)}`}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800"
            >
              Play pilot
            </Link>
          ) : (
            <Link
              href="/pilots/read-and-answer"
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
