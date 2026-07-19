"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { SentenceStripTile } from "@/lib/sentence-strip/domain";

type BoardView = {
  boardId: string;
  orderedTileIds: string[];
  status: string;
  feedback: string | null;
  sentence?: string;
};

type Snapshot = {
  phase: string;
  prompt: {
    title: string;
    instructions: string;
    tiles: SentenceStripTile[];
    targetSentence?: string;
  };
  boards?: BoardView[];
  myBoard?: BoardView | null;
  role: "host" | "player";
  userId: string;
};

export function SentenceStripSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/activity/sentence-strip/${sessionId}`);
    const payload = (await res.json()) as Snapshot & { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Could not load activity.");
      return;
    }
    setData(payload);
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const command = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/activity/sentence-strip/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const moveTile = (tileId: string, direction: -1 | 1) => {
    if (!data?.myBoard) return;
    const ids = [...data.myBoard.orderedTileIds];
    const idx = ids.indexOf(tileId);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= ids.length) return;
    const tmp = ids[idx]!;
    ids[idx] = ids[next]!;
    ids[next] = tmp;
    setData({
      ...data,
      myBoard: { ...data.myBoard, orderedTileIds: ids },
    });
  };

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-6">
        <p className="text-slate-700">{error ?? "Loading sentence strip…"}</p>
      </div>
    );
  }

  const tileById = new Map(data.prompt.tiles.map((t) => [t.id, t.text]));

  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Sentence strip
            </p>
            <h1 className="text-xl font-bold text-slate-900">{data.prompt.title}</h1>
            <p className="text-sm text-slate-600">{data.prompt.instructions}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-900 px-2 py-1 font-mono text-sm text-white">
              {sessionId}
            </span>
            <span className="text-xs font-semibold text-slate-500">{data.phase}</span>
            <button
              type="button"
              className="text-sm text-slate-600 underline"
              onClick={() => router.push("/whiteboard/join")}
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {data.role === "host" && (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void command({ type: "OPEN_BOARDS" })}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Open boards
              </button>
            </div>
            {data.prompt.targetSentence && (
              <p className="text-sm text-slate-600">
                Target: <span className="font-semibold">{data.prompt.targetSentence}</span>
              </p>
            )}
            <ul className="space-y-2">
              {(data.boards ?? []).map((board) => (
                <li
                  key={board.boardId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {board.sentence || "(empty)"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {board.status}
                      {board.feedback ? ` · feedback: ${board.feedback}` : ""}
                    </p>
                  </div>
                  {(board.status === "SUBMITTED" || board.status === "RETURNED") && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={returnFeedback}
                        onChange={(e) => setReturnFeedback(e.target.value)}
                        placeholder="Feedback"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                        onClick={() =>
                          void command({
                            type: "RETURN_BOARD",
                            boardId: board.boardId,
                            feedback: returnFeedback,
                          }).then(() => setReturnFeedback(""))
                        }
                      >
                        Return
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.role === "player" && data.myBoard && (
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {data.myBoard.feedback && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <span className="font-bold">Teacher feedback: </span>
                {data.myBoard.feedback}
              </div>
            )}
            <p className="text-sm font-semibold text-slate-700">
              Status: {data.myBoard.status}
            </p>
            <ol className="space-y-2">
              {data.myBoard.orderedTileIds.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-sky-50 px-3 py-2"
                >
                  <span className="text-lg font-bold text-slate-900">{tileById.get(id)}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy || data.myBoard?.status === "SUBMITTED" || data.phase !== "OPEN"}
                      className="rounded bg-white px-2 py-1 text-xs font-bold shadow disabled:opacity-40"
                      onClick={() => moveTile(id, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={busy || data.myBoard?.status === "SUBMITTED" || data.phase !== "OPEN"}
                      className="rounded bg-white px-2 py-1 text-xs font-bold shadow disabled:opacity-40"
                      onClick={() => moveTile(id, 1)}
                    >
                      Down
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              disabled={
                busy || data.phase !== "OPEN" || data.myBoard.status === "SUBMITTED"
              }
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              onClick={() =>
                void command({
                  type: "SUBMIT",
                  orderedTileIds: data.myBoard?.orderedTileIds ?? [],
                })
              }
            >
              Submit sentence
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
