"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { WordCardsCardEditor } from "@/components/word-cards/WordCardsCardEditor";
import { WordCardsPlayPanel } from "@/components/word-cards/WordCardsPlayPanel";
import { WordCardsReviewPanel } from "@/components/word-cards/WordCardsReviewPanel";
import { clearWordCardsSessionContext } from "@/lib/word-cards/client-context";
import {
  cardIdForGroup,
  cardIdForStudent,
  DEFAULT_WORD_CARDS_SETTINGS,
  isInClassDeck,
  isInClassPile,
  type WordCardsParticipationMode,
  type WordCardsPrompt,
  type WordCardsRoundSettings,
} from "@/lib/word-cards/domain";
import {
  canStartDefinitionRace,
  listApprovedPlayableCards,
  type WordCardsPlayState,
} from "@/lib/word-cards/play";
import {
  canPushCardForReview,
  type WordCardsReviewState,
} from "@/lib/word-cards/review";

type Props = {
  joinCode: string;
  roundId: string;
  role: "host" | "player";
  userId: string;
  displayName: string;
  vcSessionId: string;
};

type RosterRow = {
  id: string;
  name: string;
  word: string;
  definition: string;
  status: string;
  moderation: string;
  returnNote: string | null;
  ownerType: string;
  ownerId: string;
};

function readRuntime<T>(root: unknown, key: string): T | null {
  const runtime = (root as { runtime?: { get?: (k: string) => unknown } & Record<string, unknown> })
    .runtime;
  if (!runtime) return null;
  if (typeof runtime.get === "function") return (runtime.get(key) as T) ?? null;
  return ((runtime as Record<string, unknown>)[key] as T) ?? null;
}

function readCardField(cards: unknown, cardId: string, key: string): unknown {
  if (!cards || typeof cards !== "object") return null;
  const map = cards as { get?: (id: string) => unknown } & Record<string, unknown>;
  const raw =
    typeof map.get === "function" ? map.get(cardId) : (map as Record<string, unknown>)[cardId];
  if (!raw || typeof raw !== "object") return null;
  const card = raw as { get?: (k: string) => unknown } & Record<string, unknown>;
  if (typeof card.get === "function") return card.get(key);
  return card[key];
}

export function WordCardsActivityShell({
  joinCode,
  roundId,
  role,
  userId,
  displayName,
  vcSessionId,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [returnNote, setReturnNote] = useState("Please revise using the success criteria.");
  const [inspectId, setInspectId] = useState<string | null>(null);

  const phase = useStorage((root) => readRuntime<string>(root, "phase") ?? "waiting");
  const participationMode = useStorage(
    (root) =>
      (readRuntime<WordCardsParticipationMode>(root, "participationMode") ??
        "individual") as WordCardsParticipationMode,
  );
  const prompt = useStorage(
    (root) =>
      readRuntime<WordCardsPrompt>(root, "prompt") ?? {
        title: "Word cards",
        instructions: "",
        successCriteria: "",
      },
  );
  const wordList = useStorage((root) => readRuntime<string[]>(root, "wordList") ?? []);
  const settings = useStorage(
    (root) =>
      readRuntime<WordCardsRoundSettings>(root, "settings") ?? DEFAULT_WORD_CARDS_SETTINGS,
  );
  const myGroupId = useStorage((root) => {
    const participants = (root as { participants?: unknown }).participants;
    if (!participants || typeof participants !== "object") return null;
    const map = participants as { get?: (id: string) => unknown };
    const raw = typeof map.get === "function" ? map.get(userId) : null;
    if (!raw || typeof raw !== "object") return null;
    const p = raw as { get?: (k: string) => unknown; groupId?: string | null };
    const gid =
      typeof p.get === "function" ? p.get("groupId") : p.groupId;
    return (gid as string | null) ?? null;
  });
  const myReady = useStorage((root) => {
    const participants = (root as { participants?: unknown }).participants;
    if (!participants || typeof participants !== "object") return false;
    const map = participants as { get?: (id: string) => unknown };
    const raw = typeof map.get === "function" ? map.get(userId) : null;
    if (!raw || typeof raw !== "object") return false;
    const p = raw as { get?: (k: string) => unknown; ready?: boolean };
    return Boolean(typeof p.get === "function" ? p.get("ready") : p.ready);
  });
  const activeGroupIds = useStorage((root) => {
    const groups = (root as { groups?: unknown }).groups;
    if (!groups || typeof groups !== "object") return [] as string[];
    if (typeof (groups as { entries?: unknown }).entries !== "function") return [] as string[];
    return [...(groups as { entries: () => IterableIterator<[string, unknown]> }).entries()].map(
      ([id]) => id,
    );
  });
  const myCardId =
    participationMode === "group" && myGroupId
      ? cardIdForGroup(myGroupId)
      : cardIdForStudent(userId);
  const cardStatus = useStorage((root) => {
    const cards = (root as { cards?: unknown }).cards;
    return String(readCardField(cards, myCardId, "status") ?? "waiting");
  });
  const play = useStorage((root) => {
    const raw = readRuntime<WordCardsPlayState | null>(root, "play");
    return raw && typeof raw === "object" ? raw : null;
  });
  const review = useStorage((root) => {
    const raw = readRuntime<WordCardsReviewState | null>(root, "review");
    return raw && typeof raw === "object" && Array.isArray(raw.targetIds) ? raw : null;
  });
  const hasReviewPush = Boolean(review?.targetIds?.length);
  const isWorkOwner =
    participationMode === "group" ? Boolean(myGroupId) : undefined;

  const roster = useStorage((root) => {
    const cards = (root as { cards?: unknown }).cards;
    if (!cards || typeof cards !== "object") return [] as RosterRow[];
    const out: RosterRow[] = [];
    if (typeof (cards as { entries?: unknown }).entries === "function") {
      for (const [id, raw] of (
        cards as { entries: () => IterableIterator<[string, unknown]> }
      ).entries()) {
        const card = raw as { get?: (k: string) => unknown } & Record<string, unknown>;
        const get = (k: string) =>
          typeof card.get === "function" ? card.get(k) : card[k];
        if (get("ownerType") === "teacher") continue;
        out.push({
          id,
          name: String(get("displayName") ?? get("ownerId") ?? id),
          word: String(get("assignedWord") ?? ""),
          definition: String(get("definition") ?? ""),
          status: String(get("status") ?? ""),
          moderation: String(get("moderation") ?? "none"),
          returnNote: (get("returnNote") as string | null) ?? null,
          ownerType: String(get("ownerType") ?? "student"),
          ownerId: String(get("ownerId") ?? ""),
        });
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  });

  const hostRoster = useMemo(() => {
    if (participationMode !== "group") return roster;
    // Prefer group cards; keep orphan/locked group cards visible for history.
    const groupCards = roster.filter((r) => r.ownerType === "group");
    return groupCards.length > 0 ? groupCards : roster;
  }, [participationMode, roster]);

  const pile = useMemo(
    () => hostRoster.filter((r) => isInClassPile(r.moderation)),
    [hostRoster],
  );
  const deck = useMemo(
    () => hostRoster.filter((r) => isInClassDeck(r.moderation)),
    [hostRoster],
  );
  /** Pile + returned/revising (not in deck) so host can still see revision work. */
  const pilePanel = useMemo(
    () => hostRoster.filter((r) => !isInClassDeck(r.moderation)),
    [hostRoster],
  );
  const minDeck = settings.minDeckSizeForPlay ?? DEFAULT_WORD_CARDS_SETTINGS.minDeckSizeForPlay;
  const playableApproved = useMemo(
    () =>
      listApprovedPlayableCards(
        hostRoster.map((r) => ({
          id: r.id,
          assignedWord: r.word,
          definition: r.definition,
          moderation: r.moderation,
        })),
      ).length,
    [hostRoster],
  );
  const playReady = canStartDefinitionRace(playableApproved, minDeck);

  const facing = useMemo(() => {
    const playWorkStatus =
      phase === "play" && play && (play.status === "locked" || play.status === "revealed")
        ? "locked"
        : cardStatus;
    return studentFacingState({
      phase,
      workStatus: playWorkStatus,
      hasReviewPush,
    });
  }, [phase, cardStatus, play, hasReviewPush]);

  const moderatePhase =
    phase === "collected" ||
    phase === "review" ||
    phase === "revision" ||
    phase === "moderating";
  const reviewPushPhase =
    phase === "collected" || phase === "review" || phase === "moderating";
  const inPlay = phase === "play";

  const reviewableSelected = useMemo(
    () =>
      selectedIds.filter((id) => {
        const row = hostRoster.find((r) => r.id === id);
        if (!row) return false;
        return canPushCardForReview({
          status: row.status,
          ownerType: row.ownerType,
          ownerId: row.ownerId,
          activeGroupIds,
        });
      }),
    [selectedIds, hostRoster, activeGroupIds],
  );

  const setReady = async (ready: boolean) => {
    setBusy("SET_READY");
    setError(null);
    try {
      const res = await fetch(`/api/word-cards/${joinCode}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SET_READY", ready }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not update Ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  };

  const runTeacher = useCallback(
    async (command: Record<string, unknown>) => {
      setBusy(String(command.type));
      setError(null);
      try {
        const res = await fetch(`/api/word-cards/${joinCode}/commands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Command failed.");
        if (command.type === "COMPLETE") {
          clearWordCardsSessionContext();
          router.push(`/teacher/virtual-classroom/${vcSessionId}`);
        }
        if (command.type === "RETURN" || command.type === "APPROVE_CARD") {
          setSelectedIds([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      } finally {
        setBusy(null);
      }
    },
    [joinCode, router, vcSessionId],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const pendingSelected = selectedIds.filter((id) =>
    pile.some((row) => row.id === id),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-violet-50 to-slate-100 text-slate-900">
      <header className="border-b border-violet-100 bg-white/90 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-800">Word cards</p>
            <h1 className="text-lg font-bold text-slate-900">{prompt.title}</h1>
            <p className="text-sm text-slate-600">
              {facing} · {displayName}
              {role === "host" ? " (teacher)" : ""}
            </p>
          </div>
          {role === "host" && (
            <div className="flex flex-wrap gap-2">
              {phase === "waiting" && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void runTeacher({ type: "OPEN" })}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "OPEN" ? "Opening…" : teacherControlLabel("OPEN")}
                </button>
              )}
              {(phase === "active" || phase === "revision") && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void runTeacher({ type: "COLLECT" })}
                  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "COLLECT" ? "Collecting…" : teacherControlLabel("COLLECT")}
                </button>
              )}
              {(phase === "collected" || phase === "review" || phase === "moderating") && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void runTeacher({ type: "REVISE" })}
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "REVISE" ? "Starting…" : teacherControlLabel("REVISE")}
                </button>
              )}
              {(phase === "collected" || phase === "review" || phase === "moderating") && (
                <button
                  type="button"
                  disabled={Boolean(busy) || !playReady}
                  onClick={() => void runTeacher({ type: "START_PLAY" })}
                  title={
                    playReady
                      ? "Start Definition race"
                      : `Need ${minDeck} approved cards with definitions`
                  }
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {busy === "START_PLAY" ? "Starting…" : teacherControlLabel("START_PLAY")}
                </button>
              )}
              {phase !== "completed" && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Complete this word cards round? Students return to the classroom.",
                      )
                    ) {
                      void runTeacher({ type: "COMPLETE" });
                    }
                  }}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "COMPLETE" ? "Completing…" : teacherControlLabel("COMPLETE")}
                </button>
              )}
            </div>
          )}
        </div>
        {error && <p className="mx-auto mt-2 max-w-5xl text-sm text-red-600">{error}</p>}
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">{prompt.instructions}</p>
            {prompt.successCriteria ? (
              <p className="mt-2 text-xs text-slate-500">Success: {prompt.successCriteria}</p>
            ) : null}
          </section>

          {role === "host" && phase === "waiting" && (
            <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
              <p className="font-semibold">Waiting to Open</p>
              <p className="mt-1">
                {wordList.length} words ready
                {participationMode === "group"
                  ? activeGroupIds.length > 0
                    ? ` · ${activeGroupIds.length} groups assigned`
                    : " · send groups from Virtual Classroom before Open"
                  : ""}
                . Press Open to assign words and let students start.
              </p>
              <p className="mt-2 text-xs text-violet-800">
                Round {roundId} · {participationMode}
              </p>
            </section>
          )}

          {role === "player" && phase === "waiting" && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-900">Get ready</p>
              <p className="mt-2 text-sm text-slate-600">
                {participationMode === "group"
                  ? "Your teacher will send groups and Open the activity."
                  : "Your teacher will Open the activity and assign your vocabulary word."}
              </p>
            </section>
          )}

          {role === "player" &&
            participationMode === "group" &&
            !myGroupId &&
            !inPlay &&
            phase !== "waiting" &&
            phase !== "completed" && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                You are not in a group yet. Wait for your teacher to send groups.
              </section>
            )}

          {inPlay && (
            <WordCardsPlayPanel
              joinCode={joinCode}
              role={role}
              userId={userId}
              busy={busy}
              onCommand={runTeacher}
            />
          )}

          {!inPlay && hasReviewPush && (
            <WordCardsReviewPanel
              joinCode={joinCode}
              role={role}
              userId={userId}
              phase={phase}
              busy={Boolean(busy)}
              onTeacherCommand={runTeacher}
            />
          )}

          {role === "player" &&
            !inPlay &&
            !hasReviewPush &&
            (participationMode !== "group" || myGroupId) &&
            (phase === "active" ||
              phase === "revision" ||
              phase === "collected" ||
              phase === "moderating" ||
              phase === "review" ||
              cardStatus === "submitted" ||
              cardStatus === "returned" ||
              cardStatus === "revising") && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {participationMode === "group" &&
                  settings.groupSubmitPolicy === "everyone_ready" &&
                  (phase === "active" || phase === "revision") && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void setReady(!myReady)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                          myReady
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {myReady ? "Ready ✓" : "Mark ready"}
                      </button>
                      <span className="text-xs text-slate-500">
                        Everyone in your group must be ready to submit.
                      </span>
                    </div>
                  )}
                <WordCardsCardEditor
                  cardId={myCardId}
                  joinCode={joinCode}
                  role={role}
                  userId={userId}
                  phase={phase}
                  hasReviewPush={hasReviewPush}
                  isWorkOwner={isWorkOwner}
                />
              </section>
            )}

          {role === "host" &&
            !inPlay &&
            (phase === "active" ||
              phase === "revision" ||
              phase === "collected" ||
              phase === "review" ||
              phase === "moderating") && (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      {moderatePhase
                        ? "Class pile"
                        : participationMode === "group"
                          ? "Group cards"
                          : "Student cards"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {moderatePhase
                        ? `${pile.length} pending`
                        : `${hostRoster.length} cards`}
                    </p>
                  </div>
                  {moderatePhase && (
                    <p className="mt-1 text-xs text-slate-500">
                      Approve into the class deck, Return for revision, or open a card to Edit.
                    </p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {(moderatePhase ? pilePanel : hostRoster).map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        {moderatePhase && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            aria-label={`Select ${row.name}`}
                          />
                        )}
                        <button
                          type="button"
                          className="font-semibold text-violet-900 underline-offset-2 hover:underline"
                          onClick={() => setInspectId(row.id)}
                        >
                          {row.name}
                        </button>
                        <span className="text-slate-500">· {row.word || "—"}</span>
                        <span className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                          {row.status}
                        </span>
                        {row.moderation !== "none" && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-900 ring-1 ring-amber-200">
                            {row.moderation}
                          </span>
                        )}
                        {row.ownerType === "group" &&
                          activeGroupIds.length > 0 &&
                          !activeGroupIds.includes(row.ownerId) && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                              orphan
                            </span>
                          )}
                      </li>
                    ))}
                    {moderatePhase && pilePanel.length === 0 && (
                      <li className="text-sm text-slate-500">
                        No pending cards. Approve moves cards into the deck below.
                      </li>
                    )}
                    {!moderatePhase && hostRoster.length === 0 && (
                      <li className="text-sm text-slate-500">
                        {participationMode === "group"
                          ? "No group cards yet — send groups from Virtual Classroom."
                          : "No student cards yet."}
                      </li>
                    )}
                  </ul>

                  {moderatePhase && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        disabled={Boolean(busy) || pendingSelected.length === 0}
                        onClick={() =>
                          void runTeacher({
                            type: "APPROVE_CARD",
                            cardIds: pendingSelected,
                          })
                        }
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                      >
                        {busy === "APPROVE_CARD"
                          ? "Approving…"
                          : teacherControlLabel("APPROVE_CARD")}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy) || pile.length === 0}
                        onClick={() =>
                          void runTeacher({
                            type: "APPROVE_CARD",
                            cardIds: pile.map((r) => r.id),
                          })
                        }
                        className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-900 disabled:opacity-40"
                      >
                        Approve all pending
                      </button>
                      {reviewPushPhase && (
                        <>
                          <button
                            type="button"
                            disabled={Boolean(busy) || reviewableSelected.length !== 1}
                            onClick={() =>
                              void runTeacher({
                                type: "SHOW",
                                cardId: reviewableSelected[0],
                              })
                            }
                            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                          >
                            {busy === "SHOW" ? "Showing…" : teacherControlLabel("SHOW")}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busy) || reviewableSelected.length !== 2}
                            onClick={() =>
                              void runTeacher({
                                type: "COMPARE",
                                cardIds: [
                                  reviewableSelected[0],
                                  reviewableSelected[1],
                                ] as [string, string],
                              })
                            }
                            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                          >
                            {busy === "COMPARE" ? "Comparing…" : teacherControlLabel("COMPARE")}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {moderatePhase && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Return note
                        <input
                          type="text"
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={Boolean(busy) || selectedIds.length === 0}
                        onClick={() =>
                          void runTeacher({
                            type: "RETURN",
                            cardIds: selectedIds,
                            note: returnNote,
                          })
                        }
                        className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                      >
                        {busy === "RETURN" ? "Returning…" : teacherControlLabel("RETURN")}
                      </button>
                    </div>
                  )}
                </section>

                {moderatePhase && (
                  <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-sm font-bold text-slate-900">Class deck</h2>
                      <p className="text-xs text-slate-600">
                        {deck.length} / {minDeck} for play
                        {playReady ? " · ready" : ""}
                      </p>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {deck.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-emerald-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            aria-label={`Select ${row.name}`}
                          />
                          <button
                            type="button"
                            className="font-semibold text-emerald-900 underline-offset-2 hover:underline"
                            onClick={() => setInspectId(row.id)}
                          >
                            {row.name}
                          </button>
                          <span className="text-slate-500">· {row.word || "—"}</span>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900">
                            approved
                          </span>
                        </li>
                      ))}
                      {deck.length === 0 && (
                        <li className="text-sm text-slate-500">
                          Approved cards appear here. Only the deck is playable later.
                        </li>
                      )}
                    </ul>
                  </section>
                )}
              </>
            )}

          {role === "host" && !inPlay && inspectId && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Inspect / edit card</h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-600"
                  onClick={() => setInspectId(null)}
                >
                  Close
                </button>
              </div>
              <WordCardsCardEditor
                cardId={inspectId}
                joinCode={joinCode}
                role="host"
                userId={userId}
                phase={phase}
                hostCanEdit={moderatePhase && !hasReviewPush}
                hasReviewPush={hasReviewPush}
              />
            </section>
          )}

          {phase === "completed" && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-semibold">Word cards complete</p>
              <p className="mt-2 text-sm text-slate-600">
                Return to the Virtual Classroom for the next activity.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <p className="font-semibold text-slate-900">Phase</p>
            <p className="mt-1 capitalize text-slate-600">{phase}</p>
            <p className="mt-3 font-semibold text-slate-900">Word list</p>
            <p className="mt-1 text-xs text-slate-500">{wordList.length} words</p>
            {role === "host" && (moderatePhase || inPlay) && (
              <>
                <p className="mt-3 font-semibold text-slate-900">Moderation</p>
                <p className="mt-1 text-xs text-slate-500">
                  Pile {pile.length} · Deck {deck.length}
                  {playReady ? " · play ready" : ` · need ${Math.max(0, minDeck - deck.length)} more`}
                </p>
              </>
            )}
            {inPlay && (
              <>
                <p className="mt-3 font-semibold text-slate-900">Race</p>
                <p className="mt-1 text-xs text-slate-500 capitalize">
                  {play?.status ?? "—"} · item {(play?.itemIndex ?? 0) + 1}
                </p>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
