"use client";

import { useEffect, useState } from "react";
import { useDailyCall } from "@/components/virtual-classroom/daily/useDailyCall";

type Props = {
  sessionId: string;
  isHost: boolean;
  sessionEnded: boolean;
  /** dock = Learn (materials + corner Prebuilt); stage = Meeting (viewport-filling video). */
  layout?: "dock" | "stage";
  /** Host: leave Meeting layout for Learn (materials + dock). */
  onExitToLearn?: () => void;
  /** Host: end the VC for everyone. */
  onEndSession?: () => void;
  endSessionBusy?: boolean;
  /** Student: leave the classroom entirely. */
  onLeaveClassroom?: () => void;
};

function disabledDismissKey(sessionId: string) {
  return `wke-daily-disabled-dismiss:${sessionId}`;
}

function entrySkipKey(sessionId: string) {
  return `wke-daily-entry-skip:${sessionId}`;
}

/**
 * One Daily Prebuilt instance for the session.
 * Layout CSS switches Meeting ↔ Learn without leave/join.
 * First visit: entry gate probes + connects, then the call stays live.
 */
export function DailyVideoDock({
  sessionId,
  isHost,
  sessionEnded,
  layout = "dock",
  onExitToLearn,
  onEndSession,
  endSessionBusy = false,
  onLeaveClassroom,
}: Props) {
  const isStage = layout === "stage";
  const {
    phase,
    error,
    expanded,
    setExpanded,
    containerRef,
    connect,
    leave,
    requestFullscreen,
    retryProbe,
  } = useDailyCall({
    sessionId,
    isHost,
    sessionEnded,
  });
  const [pendingConnect, setPendingConnect] = useState(false);
  const [disabledDismissed, setDisabledDismissed] = useState(false);
  const [entrySkipped, setEntrySkipped] = useState(false);
  const [entryStarted, setEntryStarted] = useState(false);
  const [hasCompletedEntry, setHasCompletedEntry] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptBusy, setTranscriptBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [hostNote, setHostNote] = useState<string | null>(null);
  const [hostNoteKind, setHostNoteKind] = useState<"transcript" | "recording" | null>(
    null,
  );

  useEffect(() => {
    try {
      setDisabledDismissed(
        sessionStorage.getItem(disabledDismissKey(sessionId)) === "1",
      );
      const skipped = sessionStorage.getItem(entrySkipKey(sessionId)) === "1";
      setEntrySkipped(skipped);
      if (skipped) setHasCompletedEntry(true);
    } catch {
      setDisabledDismissed(false);
      setEntrySkipped(false);
    }
  }, [sessionId]);

  const busy = phase === "connecting" || phase === "probing";
  const joined = phase === "joined";
  const prejoinReady = phase === "prejoin";
  useEffect(() => {
    // Unlock as soon as Daily Prebuilt is up (prejoin lobby or joined).
    // Waiting only for joined-meeting deadlocks under our overlay.
    if (joined || prejoinReady) setHasCompletedEntry(true);
  }, [joined, prejoinReady]);
  const entryComplete = hasCompletedEntry || entrySkipped;
  const showEntryGate = !sessionEnded && !entryComplete;
  const showDockChrome = entryComplete && (expanded || isStage);
  const showMinimizedFab = entryComplete && !isStage && !expanded;

  useEffect(() => {
    if (!pendingConnect) return;
    if (!containerRef.current) return;
    setPendingConnect(false);
    void connect();
  }, [pendingConnect, containerRef, connect]);

  // Meeting keeps the frame expanded; Learn may minimize after join.
  useEffect(() => {
    if (isStage) setExpanded(true);
  }, [isStage, setExpanded]);

  // Everyone: probe then connect once on entry (layout switches stay joined).
  useEffect(() => {
    if (sessionEnded || entrySkipped || entryStarted) return;
    if (phase === "joined") {
      setEntryStarted(true);
      return;
    }
    if (phase !== "ready") return;
    setEntryStarted(true);
    setExpanded(true);
    setPendingConnect(true);
  }, [sessionEnded, entrySkipped, entryStarted, phase, setExpanded]);

  const requestConnect = () => {
    setExpanded(true);
    setPendingConnect(true);
  };

  const skipEntry = () => {
    setEntrySkipped(true);
    try {
      sessionStorage.setItem(entrySkipKey(sessionId), "1");
    } catch {
      // ignore
    }
  };

  const goBrowserFullscreen = () => {
    if (!joined) return;
    void requestFullscreen();
  };

  const toggleTranscription = async () => {
    if (!isHost || transcriptBusy) return;
    setTranscriptBusy(true);
    setHostNote(null);
    setHostNoteKind(null);
    try {
      const action = transcribing ? "stop" : "start";
      const res = await fetch(
        `/api/virtual-classroom/${sessionId}/daily/transcription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = (await res.json()) as {
        error?: string;
        transcriptionEnabled?: boolean;
      };
      if (!res.ok) {
        setHostNote(payload.error ?? "Transcription request failed.");
        setHostNoteKind("transcript");
        return;
      }
      setTranscribing(Boolean(payload.transcriptionEnabled));
      setHostNoteKind("transcript");
      setHostNote(
        action === "start"
          ? "Transcribing… Stop when the class ends to save the transcript."
          : "Stopping… transcript will appear for review when ready.",
      );
    } catch {
      setHostNote("Transcription request failed.");
      setHostNoteKind("transcript");
    } finally {
      setTranscriptBusy(false);
    }
  };

  const toggleRecording = async () => {
    if (!isHost || recordBusy) return;
    setRecordBusy(true);
    setHostNote(null);
    setHostNoteKind(null);
    try {
      const action = recording ? "stop" : "start";
      const res = await fetch(
        `/api/virtual-classroom/${sessionId}/daily/recording`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = (await res.json()) as {
        error?: string;
        recording?: boolean;
      };
      if (!res.ok) {
        setHostNote(payload.error ?? "Recording request failed.");
        setHostNoteKind("recording");
        return;
      }
      setRecording(Boolean(payload.recording));
      setHostNoteKind("recording");
      setHostNote(
        action === "start"
          ? "Recording… Stop when the class ends to save the video."
          : "Stopping… recording will appear for review when ready.",
      );
    } catch {
      setHostNote("Recording request failed.");
      setHostNoteKind("recording");
    } finally {
      setRecordBusy(false);
    }
  };

  const dismissDisabled = () => {
    setDisabledDismissed(true);
    skipEntry();
    try {
      sessionStorage.setItem(disabledDismissKey(sessionId), "1");
    } catch {
      // ignore
    }
  };

  const dockOffsetClass = isHost
    ? "bottom-20 right-3 md:bottom-4 md:right-4"
    : "bottom-3 right-3 md:bottom-4 md:right-4";

  const entryStepLabel =
    phase === "probing"
      ? "Checking class video…"
      : phase === "connecting" || pendingConnect
        ? "Connecting to the call…"
        : phase === "prejoin"
          ? "Almost ready…"
          : phase === "error"
            ? "Couldn’t connect yet"
            : phase === "disabled"
              ? "Class video unavailable"
              : "Preparing video…";

  const entryProgress =
    phase === "joined"
      ? 100
      : phase === "prejoin"
        ? 90
        : phase === "connecting" || pendingConnect
          ? 70
          : phase === "ready"
            ? 45
            : phase === "probing"
              ? 20
              : phase === "error" || phase === "disabled"
                ? 100
                : 10;

  const controlButtons = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {joined && isHost ? (
        <>
          <button
            type="button"
            disabled={transcriptBusy}
            onClick={() => void toggleTranscription()}
            className={`rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${
              transcribing
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                : "border border-slate-600 text-slate-100 hover:bg-slate-800"
            }`}
          >
            {transcriptBusy
              ? "…"
              : transcribing
                ? "Stop transcript"
                : "Transcribe"}
          </button>
          <button
            type="button"
            disabled={recordBusy}
            onClick={() => void toggleRecording()}
            className={`rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${
              recording
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "border border-slate-600 text-slate-100 hover:bg-slate-800"
            }`}
          >
            {recordBusy ? "…" : recording ? "Stop record" : "Record"}
          </button>
        </>
      ) : null}
      {joined && isStage ? (
        <button
          type="button"
          onClick={goBrowserFullscreen}
          className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
          title="Browser fullscreen (Esc to exit)"
        >
          Browser fullscreen
        </button>
      ) : null}
      {isStage && onExitToLearn ? (
        <button
          type="button"
          onClick={onExitToLearn}
          className="rounded-md border border-teal-500 px-2.5 py-1 text-xs font-bold text-teal-200 hover:bg-slate-800"
        >
          Learn
        </button>
      ) : null}
      {isStage && onEndSession ? (
        <button
          type="button"
          disabled={endSessionBusy}
          onClick={onEndSession}
          className="rounded-md bg-red-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {endSessionBusy ? "Ending…" : "End session"}
        </button>
      ) : null}
      {isStage && onLeaveClassroom ? (
        <button
          type="button"
          onClick={onLeaveClassroom}
          className="rounded-md border border-slate-500 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
        >
          Leave classroom
        </button>
      ) : null}
      {joined ? (
        <button
          type="button"
          onClick={() => void leave()}
          className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-600"
        >
          Leave video
        </button>
      ) : null}
      {!isStage ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
        >
          Minimize
        </button>
      ) : null}
    </div>
  );

  // Single shell + containerRef for the whole session — CSS only for Meeting ↔ Learn.
  const shellClass = isStage
    ? "pointer-events-auto fixed inset-0 z-40 flex flex-col overflow-hidden bg-slate-950"
    : showDockChrome
      ? `pointer-events-auto fixed z-40 flex max-w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-xl ${dockOffsetClass}`
      : `pointer-events-none fixed z-0 flex max-w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden opacity-0 ${dockOffsetClass}`;

  const frameHeightClass = isStage
    ? "min-h-0 w-full flex-1 bg-slate-900"
    : "h-[min(36vh,260px)] w-[min(100vw-1.5rem,420px)] bg-slate-900 md:h-[min(42vh,320px)]";

  return (
    <>
      {showEntryGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 px-6 py-8 text-center shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-300">
              Live class
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">{entryStepLabel}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {phase === "disabled"
                ? error ??
                  "Video isn’t configured on this server. You can continue without it."
                : phase === "error"
                  ? error ?? "Check your camera/mic permissions, then try again."
                  : "We’ll keep this connection when you switch Meeting and Learn."}
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${entryProgress}%` }}
              />
            </div>
            {phase === "probing" ||
            phase === "connecting" ||
            phase === "ready" ||
            pendingConnect ? (
              <p className="mt-4 text-xs text-slate-400">Please wait…</p>
            ) : null}
            {phase === "error" || phase === "disabled" ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {phase === "error" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEntryStarted(false);
                        requestConnect();
                      }}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-50"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void retryProbe()}
                      className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-800"
                    >
                      Recheck
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void retryProbe()}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-800"
                  >
                    Recheck
                  </button>
                )}
                <button
                  type="button"
                  onClick={phase === "disabled" ? dismissDisabled : skipEntry}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Continue without video
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {entryComplete && phase === "disabled" && !disabledDismissed ? (
        <div
          className={
            isStage
              ? "fixed inset-0 z-40 flex items-center justify-center bg-slate-950 p-6"
              : `pointer-events-auto fixed z-40 max-w-[min(100vw-1.5rem,360px)] ${dockOffsetClass}`
          }
        >
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 shadow-lg">
            <p className="text-xs font-bold text-amber-950">Class video unavailable</p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-900">
              {error ??
                "Daily video is not configured on this server (missing API key or disabled)."}
              {isHost
                ? " Students will not see a Video control until this is fixed."
                : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void retryProbe()}
                className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
              >
                Recheck
              </button>
              {isStage && onExitToLearn ? (
                <button
                  type="button"
                  onClick={onExitToLearn}
                  className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
                >
                  Back to Learn
                </button>
              ) : null}
              {!isStage ? (
                <button
                  type="button"
                  onClick={dismissDisabled}
                  className="rounded-md px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:underline"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={shellClass}
        aria-hidden={showEntryGate || (!isStage && !expanded)}
      >
        {showDockChrome ? (
          <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
              {isStage ? "Meeting" : "Class video"}
            </p>
            {controlButtons}
          </div>
        ) : null}
        {showDockChrome && isHost && hostNote ? (
          <p className="border-b border-slate-700 px-3 py-1.5 text-[11px] text-slate-300">
            {hostNote}{" "}
            {hostNoteKind === "transcript" ? (
              <a
                href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}/transcript`}
                className="font-bold text-teal-300 underline"
              >
                Review transcript
              </a>
            ) : null}
            {hostNoteKind === "recording" ? (
              <a
                href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}/recording`}
                className="font-bold text-teal-300 underline"
              >
                Review recording
              </a>
            ) : null}
          </p>
        ) : null}
        <div ref={containerRef} className={frameHeightClass} />
        {showDockChrome && error ? (
          <p className="border-t border-slate-700 px-3 py-2 text-xs text-red-300">{error}</p>
        ) : null}
        {showDockChrome && !joined && phase !== "connecting" && phase !== "prejoin" ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-700 px-3 py-2">
            <button
              type="button"
              disabled={busy}
              onClick={requestConnect}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {phase === "error" ? "Retry connect" : "Connect"}
            </button>
            {phase === "error" ? (
              <button
                type="button"
                onClick={() => void retryProbe()}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-800"
              >
                Recheck
              </button>
            ) : null}
          </div>
        ) : null}
        {showDockChrome && phase === "prejoin" ? (
          <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">
            Check camera and mic, then click Join in the video panel.
          </p>
        ) : null}
        {showDockChrome && phase === "connecting" ? (
          <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">
            Connecting to video…
          </p>
        ) : null}
      </div>

      {showMinimizedFab ? (
        <div
          className={`pointer-events-auto fixed z-40 flex items-center gap-2 ${dockOffsetClass}`}
        >
          <button
            type="button"
            onClick={() => {
              if (joined) {
                setExpanded(true);
                return;
              }
              requestConnect();
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold shadow-lg ${
              joined
                ? "bg-teal-700 text-white hover:bg-teal-600"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {joined ? "Show video" : busy ? "Video…" : "Video"}
          </button>
          {joined ? (
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
              Live
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
