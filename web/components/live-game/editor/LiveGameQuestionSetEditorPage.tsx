"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { LiveGameCraftQuestionCard } from "@/components/live-game/editor/LiveGameCraftQuestionCard";
import { LiveGameDepositQuestionCard } from "@/components/live-game/editor/LiveGameDepositQuestionCard";
import { LiveGameHarvestQuestionCard } from "@/components/live-game/editor/LiveGameHarvestQuestionCard";
import { LiveGameQuestionBankTabs } from "@/components/live-game/editor/LiveGameQuestionBankTabs";
import {
  LiveGameQuestionSetMetadataForm,
  toMetadataFormState,
} from "@/components/live-game/editor/LiveGameQuestionSetMetadataForm";
import {
  defaultPayloadForBank,
  defaultPromptForBank,
} from "@/lib/live-game/question-banks/editor-types";
import type {
  LiveGameQuestionBank,
  LiveGameQuestionRow,
  LiveGameQuestionSetEditorPayload,
} from "@/lib/live-game/question-banks/types";
import {
  createQuestion,
  deleteQuestion,
  fetchQuestionSetForEditor,
  publishQuestionSet,
  updateQuestion,
  updateQuestionSetMetadata,
} from "@/lib/live-game/question-banks/question-sets-editor-api";

type Props = {
  setId: string;
};

export function LiveGameQuestionSetEditorPage({ setId }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<LiveGameQuestionSetEditorPayload | null>(null);
  const [metadata, setMetadata] = useState(toMetadataFormState({
    id: setId,
    slug: "",
    title: "",
    level: "A1",
    topic: "",
    learningObjective: "",
    description: "",
    version: 1,
    status: "draft",
    visibility: "teacher",
    sortOrder: 0,
  }));
  const [savedMetadata, setSavedMetadata] = useState(metadata);
  const [activeBank, setActiveBank] = useState<LiveGameQuestionBank>("harvest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const readOnly = payload?.set.status === "published";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestionSetForEditor(setId);
      setPayload(data);
      const form = toMetadataFormState(data.set);
      setMetadata(form);
      setSavedMetadata(form);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load question set.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    void load();
  }, [load]);

  const metadataDirty = useMemo(
    () => JSON.stringify(metadata) !== JSON.stringify(savedMetadata),
    [metadata, savedMetadata],
  );

  const counts = useMemo(
    () => ({
      harvest: payload?.questions.harvest.length ?? 0,
      deposit: payload?.questions.deposit.length ?? 0,
      craft: payload?.questions.craft.length ?? 0,
    }),
    [payload],
  );

  const activeQuestions = payload?.questions[activeBank] ?? [];

  function replaceQuestion(updated: LiveGameQuestionRow) {
    setPayload((current) => {
      if (!current) return current;
      const bank = updated.bank;
      return {
        ...current,
        questions: {
          ...current.questions,
          [bank]: current.questions[bank].map((question) =>
            question.id === updated.id ? updated : question,
          ),
        },
      };
    });
  }

  function removeQuestion(questionId: string, bank: LiveGameQuestionBank) {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        questions: {
          ...current.questions,
          [bank]: current.questions[bank].filter((question) => question.id !== questionId),
        },
      };
    });
  }

  async function handleSaveMetadata() {
    setMetadataSaving(true);
    setError(null);
    try {
      const set = await updateQuestionSetMetadata(setId, metadata);
      setSavedMetadata(metadata);
      setPayload((current) => (current ? { ...current, set } : current));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save metadata.");
    } finally {
      setMetadataSaving(false);
    }
  }

  async function handleAddQuestion() {
    if (readOnly) return;
    setAdding(true);
    setError(null);
    try {
      const question = await createQuestion(setId, {
        bank: activeBank,
        prompt: defaultPromptForBank(activeBank),
        payload: defaultPayloadForBank(activeBank),
        enabled: true,
      });
      setPayload((current) => {
        if (!current) return current;
        return {
          ...current,
          questions: {
            ...current.questions,
            [activeBank]: [...current.questions[activeBank], question],
          },
        };
      });
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add question.");
    } finally {
      setAdding(false);
    }
  }

  async function handlePublish() {
    if (!window.confirm("Publish this question set? New rooms will use the updated version.")) {
      return;
    }
    setPublishing(true);
    setError(null);
    setPublishMessage(null);
    try {
      const result = await publishQuestionSet(setId);
      const warnings = result.warnings?.length ? ` ${result.warnings.join(" ")}` : "";
      setPublishMessage(`Published as v${result.version}.${warnings}`);
      await load();
      router.refresh();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish.");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm font-semibold text-kid-ink/70">Loading question set...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm font-semibold text-red-700">{error ?? "Question set not found."}</p>
        <Link href="/live-game/host" className="mt-4 inline-block text-sm font-bold text-kid-ink underline">
          Back to host
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <KidPanel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/live-game/host"
              className="text-sm font-bold text-kid-ink underline underline-offset-2"
            >
              ← Back to host
            </Link>
            <h1 className="mt-2 text-2xl font-extrabold text-kid-ink">Question set editor</h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/70">
              {payload.set.status === "draft" ?
                "Editing your draft copy — original system set unchanged."
              : `Published v${payload.set.version} (read-only)`}
            </p>
          </div>
          {payload.set.status === "draft" ?
            <KidButton
              variant="primary"
              disabled={publishing || metadataDirty}
              onClick={() => void handlePublish()}
              className="min-h-11 px-4 py-2 text-base"
            >
              {publishing ? "Publishing..." : `Publish (v${payload.set.version + 1})`}
            </KidButton>
          : null}
        </div>

        <LiveGameQuestionSetMetadataForm
          value={metadata}
          dirty={metadataDirty}
          saving={metadataSaving}
          readOnly={readOnly}
          onChange={(patch) => setMetadata((current) => ({ ...current, ...patch }))}
          onSave={() => void handleSaveMetadata()}
        />

        <LiveGameQuestionBankTabs active={activeBank} counts={counts} onChange={setActiveBank} />

        {!readOnly ?
          <KidButton
            variant="secondary"
            disabled={adding}
            onClick={() => void handleAddQuestion()}
            className="min-h-11 px-4 py-2 text-base"
          >
            {adding ? "Adding..." : "+ Add question"}
          </KidButton>
        : null}

        <div className="space-y-4">
          {activeQuestions.length === 0 ?
            <p className="text-sm font-semibold text-kid-ink/70">No questions in this bank yet.</p>
          : activeQuestions.map((question) => {
              if (activeBank === "harvest") {
                return (
                  <LiveGameHarvestQuestionCard
                    key={question.id}
                    question={question}
                    readOnly={readOnly}
                    onSave={async (patch) => {
                      const updated = await updateQuestion(setId, question.id, patch);
                      replaceQuestion(updated);
                    }}
                    onDelete={async () => {
                      await deleteQuestion(setId, question.id);
                      removeQuestion(question.id, "harvest");
                    }}
                  />
                );
              }
              if (activeBank === "deposit") {
                return (
                  <LiveGameDepositQuestionCard
                    key={question.id}
                    question={question}
                    readOnly={readOnly}
                    onSave={async (patch) => {
                      const updated = await updateQuestion(setId, question.id, patch);
                      replaceQuestion(updated);
                    }}
                    onDelete={async () => {
                      await deleteQuestion(setId, question.id);
                      removeQuestion(question.id, "deposit");
                    }}
                  />
                );
              }
              return (
                <LiveGameCraftQuestionCard
                  key={question.id}
                  question={question}
                  readOnly={readOnly}
                  onSave={async (patch) => {
                    const updated = await updateQuestion(setId, question.id, patch);
                    replaceQuestion(updated);
                  }}
                  onDelete={async () => {
                    await deleteQuestion(setId, question.id);
                    removeQuestion(question.id, "craft");
                  }}
                />
              );
            })
          }
        </div>

        {publishMessage ?
          <p className="text-sm font-semibold text-green-800">{publishMessage}</p>
        : null}
        {error ?
          <p className="text-sm font-semibold text-red-700">{error}</p>
        : null}
      </KidPanel>
    </div>
  );
}
