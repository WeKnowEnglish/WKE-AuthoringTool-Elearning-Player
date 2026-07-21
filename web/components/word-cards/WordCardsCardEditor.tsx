"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { WordCardsMiniCanvas } from "@/components/word-cards/WordCardsMiniCanvas";

type Props = {
  cardId: string;
  joinCode: string;
  role: "host" | "player";
  userId: string;
  phase: string;
  /** Student view / locked inspect. */
  readOnly?: boolean;
  /** Host moderation: edit text via EDIT_CARD (does not auto-approve). */
  hostCanEdit?: boolean;
  /** Locks create editing while Show/Compare is pushed. */
  hasReviewPush?: boolean;
  /** Group mode: true when this user is a current member of the card's group. */
  isWorkOwner?: boolean;
};

function readCard(cards: unknown, cardId: string) {
  if (!cards || typeof cards !== "object") return null;
  const map = cards as { get?: (id: string) => unknown };
  const raw = typeof map.get === "function" ? map.get(cardId) : null;
  if (!raw || typeof raw !== "object") return null;
  const card = raw as { get?: (k: string) => unknown } & Record<string, unknown>;
  const get = (k: string) =>
    typeof card.get === "function" ? card.get(k) : card[k];
  return {
    assignedWord: String(get("assignedWord") ?? ""),
    definition: String(get("definition") ?? ""),
    exampleSentence: String(get("exampleSentence") ?? ""),
    status: String(get("status") ?? "waiting"),
    moderation: String(get("moderation") ?? "none"),
    returnNote: (get("returnNote") as string | null) ?? null,
    ownerId: String(get("ownerId") ?? ""),
  };
}

export function WordCardsCardEditor({
  cardId,
  joinCode,
  role,
  userId,
  phase,
  readOnly = false,
  hostCanEdit = false,
  hasReviewPush = false,
  isWorkOwner,
}: Props) {
  const card = useStorage((root) => readCard((root as { cards?: unknown }).cards, cardId));
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!card) return;
    setDefinition(card.definition);
    setExample(card.exampleSentence);
  }, [card?.definition, card?.exampleSentence, cardId]);

  const isOwner =
    typeof isWorkOwner === "boolean"
      ? isWorkOwner
      : Boolean(card && card.ownerId === userId);
  const moderationAllowsHostEdit =
    card?.moderation === "pending" || card?.moderation === "approved";
  const hostEditing = role === "host" && hostCanEdit && moderationAllowsHostEdit && !readOnly;

  const canEdit =
    hostEditing ||
    (!readOnly &&
      canEditActivityWork({
        phase,
        workStatus: card?.status ?? null,
        role,
        isOwner,
        hasReviewPush,
      }));
  const canSubmit =
    !readOnly &&
    role === "player" &&
    !hasReviewPush &&
    canSubmitActivityWork({
      phase,
      workStatus: card?.status ?? null,
      isOwner,
    });

  const saveFields = useMutation(
    ({ storage }, next: { definition: string; exampleSentence: string }) => {
      const cards = storage.get("cards" as never) as unknown as {
        get: (id: string) => { set: (k: string, v: unknown) => void } | undefined;
      };
      const live = cards?.get(cardId);
      if (!live) return;
      live.set("definition", next.definition.slice(0, 500));
      live.set("exampleSentence", next.exampleSentence.slice(0, 500));
    },
    [cardId],
  );

  const onDefinitionBlur = () => {
    if (!canEdit || hostEditing) return;
    if (definition !== (card?.definition ?? "")) {
      saveFields({ definition, exampleSentence: example });
    }
  };

  const onExampleBlur = () => {
    if (!canEdit || hostEditing) return;
    if (example !== (card?.exampleSentence ?? "")) {
      saveFields({ definition, exampleSentence: example });
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      saveFields({ definition, exampleSentence: example });
      const res = await fetch(`/api/word-cards/${joinCode}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SUBMIT", cardId }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Submit failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveHostEdit = async () => {
    setBusy(true);
    setError(null);
    setSavedFlash(false);
    try {
      const res = await fetch(`/api/word-cards/${joinCode}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EDIT_CARD",
          cardId,
          definition,
          exampleSentence: example,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Save failed.");
      setSavedFlash(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!card) {
    return (
      <p className="text-sm text-slate-600">Your card is not ready yet. Wait for Open.</p>
    );
  }

  const fieldsEditable = canEdit;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
          {role === "host" ? "Word" : "Your word"}
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{card.assignedWord || "…"}</p>
        <p className="mt-1 text-xs text-slate-500">
          Status: {card.status}
          {card.moderation !== "none" ? ` · ${card.moderation}` : ""}
        </p>
      </div>

      {card.returnNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-bold">Teacher note: </span>
          {card.returnNote}
        </div>
      )}

      {hostEditing && (
        <p className="text-xs text-slate-600">
          Host edit updates the card text. Pending cards stay pending until you Approve.
        </p>
      )}

      <label className="block text-xs font-semibold text-slate-700">
        Definition
        <textarea
          value={definition}
          disabled={!fieldsEditable}
          onChange={(e) => setDefinition(e.target.value)}
          onBlur={onDefinitionBlur}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
          placeholder="Write a clear definition…"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Example sentence
        <textarea
          value={example}
          disabled={!fieldsEditable}
          onChange={(e) => setExample(e.target.value)}
          onBlur={onExampleBlur}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
          placeholder="Use the word in a natural sentence…"
        />
      </label>

      <WordCardsMiniCanvas cardId={cardId} canEdit={canEdit && !hostEditing} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedFlash && hostEditing && (
        <p className="text-sm text-emerald-700">Saved. Moderation unchanged.</p>
      )}

      {hostEditing && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveHostEdit()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : teacherControlLabel("EDIT_CARD")}
        </button>
      )}

      {role === "player" && (
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={() => void submit()}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Submitting…" : "Submit"}
        </button>
      )}

      {card.status === "submitted" || card.status === "auto_submitted" || card.status === "locked" ? (
        role === "player" ? (
          <p className="text-sm text-slate-600">
            Submitted. Wait for your teacher to Collect or start class review.
          </p>
        ) : null
      ) : null}
    </div>
  );
}
