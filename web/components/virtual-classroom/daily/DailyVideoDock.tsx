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

function autoPromptStorageKey(sessionId: string) {
  return `wke-daily-host-prompt:${sessionId}`;
}

function disabledDismissKey(sessionId: string) {
  return `wke-daily-disabled-dismiss:${sessionId}`;
}

/**
 * Learn: collapsible Daily Prebuilt corner dock.
 * Meeting: viewport-filling stage (CSS fullscreen). Browser Fullscreen API is opt-in.
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
  const [hostAutoPrompted, setHostAutoPrompted] = useState(false);
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
      if (sessionStorage.getItem(autoPromptStorageKey(sessionId)) === "joined") {
        setHostAutoPrompted(true);
      }
    } catch {
      setDisabledDismissed(false);
    }
  }, [sessionId]);

  const busy = phase === "connecting" || phase === "probing";
  const joined = phase === "joined";
  const showFrameShell =
    isStage ||
    expanded ||
    joined ||
    phase === "connecting" ||
    pendingConnect;
  const showChrome = expanded || isStage;

  useEffect(() => {
    if (!pendingConnect || !showFrameShell) return;
    if (!containerRef.current) return;
    setPendingConnect(false);
    void connect();
  }, [pendingConnect, showFrameShell, containerRef, connect]);

  // Meeting: expand + connect into the viewport stage immediately.
  useEffect(() => {
    if (!isStage || sessionEnded) return;
    setExpanded(true);
    if (phase === "ready" || phase === "error") {
      setPendingConnect(true);
    }
  }, [isStage, sessionEnded, phase, setExpanded]);

  // Host-only Learn: auto-open docked Video once when Daily is ready.
  useEffect(() => {
    if (isStage) return;
    if (!isHost || sessionEnded || hostAutoPrompted) return;
    if (phase !== "ready") return;
    setHostAutoPrompted(true);
    setExpanded(true);
    setPendingConnect(true);
  }, [isStage, isHost, sessionEnded, phase, hostAutoPrompted, setExpanded]);

  useEffect(() => {
    if (!isHost || phase !== "joined") return;
    try {
      sessionStorage.setItem(autoPromptStorageKey(sessionId), "joined");
    } catch {
      // ignore
    }
  }, [isHost, phase, sessionId]);

  useEffect(() => {
    if (!isHost) return;
    if (phase !== "error") return;
    if (!error?.toLowerCase().includes("before class")) return;
    setHostAutoPrompted(false);
  }, [isHost, phase, error]);

  const requestConnect = () => {
    setExpanded(true);
    setPendingConnect(true);
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
        recordingEnabled?: boolean;
      };
      if (!res.ok) {
        setHostNote(payload.error ?? "Recording request failed.");
        setHostNoteKind("recording");
        return;
      }
      setRecording(Boolean(payload.recordingEnabled));
      setHostNoteKind("recording");
      setHostNote(
        action === "start"
          ? "Recording… Stop when finished; playback appears on the review page."
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
    try {
      sessionStorage.setItem(disabledDismissKey(sessionId), "1");
    } catch {
      // ignore
    }
  };

  const dockOffsetClass = isHost
    ? "bottom-20 right-3 md:bottom-4 md:right-4"
    : "bottom-3 right-3 md:bottom-4 md:right-4";

  if (phase === "disabled") {
    if (disabledDismissed && !isStage) return null;
    return (
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
    );
  }

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

  const frameShell = showFrameShell ? (
    <div
      className={
        isStage
          ? "pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950"
          : expanded
            ? "pointer-events-auto flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-xl"
            : `pointer-events-none fixed z-0 flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden opacity-0 ${dockOffsetClass}`
      }
      aria-hidden={!isStage && !expanded}
    >
      {showChrome ? (
        <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
            {isStage ? "Meeting" : "Class video"}
          </p>
          {controlButtons}
        </div>
      ) : null}
      {showChrome && isHost && hostNote ? (
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
      <div
        ref={containerRef}
        className={
          isStage
            ? "min-h-0 w-full flex-1 bg-slate-900"
            : "h-[min(36vh,260px)] w-[min(100vw-1.5rem,420px)] bg-slate-900 md:h-[min(42vh,320px)]"
        }
      />
      {showChrome && error ? (
        <p className="border-t border-slate-700 px-3 py-2 text-xs text-red-300">{error}</p>
      ) : null}
      {showChrome && !joined && phase !== "connecting" ? (
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
      {showChrome && phase === "connecting" ? (
        <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">
          Connecting to video…
        </p>
      ) : null}
    </div>
  ) : null;

  if (isStage) {
    // CSS fullscreen: fill the viewport immediately (browsers block auto requestFullscreen after async join).
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-950">{frameShell}</div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed z-40 flex max-w-[min(100vw-1.5rem,420px)] flex-col items-end gap-2 ${dockOffsetClass}`}
    >
      {frameShell}

      <div className="pointer-events-auto flex items-center gap-2">
        {!expanded ? (
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
        ) : null}
        {joined && !expanded ? (
          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
            Live
          </span>
        ) : null}
      </div>
    </div>
  );
}
