"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useDailyCall } from "@/components/virtual-classroom/daily/useDailyCall";
import { dailyThemeFromTeacherTheme } from "@/lib/daily/theme-from-teacher";
import {
  resolveTeacherThemeCssVars,
  teacherThemeStore,
} from "@/lib/teacher-theme";

type Props = {
  sessionId: string;
  isHost: boolean;
  sessionEnded: boolean;
  /** dock = Learn (full-height left video rail); stage = Meeting (viewport-filling video). */
  layout?: "dock" | "stage";
  /** Host: leave Meeting layout for Learn (materials + dock). */
  onExitToLearn?: () => void;
  /** Host: enter Meeting layout from Learn. */
  onEnterMeeting?: () => void;
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
 * Learn: full-height left rail. Meeting: viewport stage.
 * Layout CSS switches without leave/join.
 * First visit: entry gate probes + connects, then the call stays live.
 */
export function DailyVideoDock({
  sessionId,
  isHost,
  sessionEnded,
  layout = "dock",
  onExitToLearn,
  onEnterMeeting,
  onEndSession,
  endSessionBusy = false,
  onLeaveClassroom,
}: Props) {
  const isStage = layout === "stage";
  const teacherTheme = useSyncExternalStore(
    teacherThemeStore.subscribe,
    teacherThemeStore.getSnapshot,
    teacherThemeStore.getServerSnapshot,
  );
  const dailyTheme = useMemo(
    () => dailyThemeFromTeacherTheme(teacherTheme),
    [teacherTheme],
  );
  const themeVars = useMemo(
    () => resolveTeacherThemeCssVars(teacherTheme) as CSSProperties,
    [teacherTheme],
  );
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
    theme: dailyTheme,
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
  // Learn rail is a permanent fixture — always show chrome once entry is done.
  const showDockChrome = entryComplete;

  useEffect(() => {
    if (!pendingConnect) return;
    if (!containerRef.current) return;
    setPendingConnect(false);
    void connect();
  }, [pendingConnect, containerRef, connect]);

  // Both layouts keep the frame expanded (no minimize on the left rail).
  useEffect(() => {
    setExpanded(true);
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
            className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50"
            style={
              transcribing
                ? {
                    backgroundColor: "var(--teacher-accent)",
                    color: "var(--teacher-accent-fg)",
                  }
                : {
                    border: "1px solid var(--teacher-border)",
                    color: "var(--teacher-fg)",
                  }
            }
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
            className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50"
            style={
              recording
                ? {
                    backgroundColor: "var(--teacher-danger)",
                    color: "#fff",
                  }
                : {
                    border: "1px solid var(--teacher-border)",
                    color: "var(--teacher-fg)",
                  }
            }
          >
            {recordBusy ? "…" : recording ? "Stop record" : "Record"}
          </button>
        </>
      ) : null}
      {joined && isStage ? (
        <button
          type="button"
          onClick={goBrowserFullscreen}
          className="rounded-md border px-2.5 py-1 text-xs font-bold"
          style={{
            borderColor: "var(--teacher-border)",
            color: "var(--teacher-fg)",
          }}
          title="Browser fullscreen (Esc to exit)"
        >
          Browser fullscreen
        </button>
      ) : null}
      {!isStage && onEnterMeeting ? (
        <button
          type="button"
          onClick={onEnterMeeting}
          className="rounded-md border px-2.5 py-1 text-xs font-bold"
          style={{
            borderColor: "var(--teacher-accent-border)",
            color: "var(--teacher-accent)",
          }}
        >
          Meeting
        </button>
      ) : null}
      {isStage && onExitToLearn ? (
        <button
          type="button"
          onClick={onExitToLearn}
          className="rounded-md border px-2.5 py-1 text-xs font-bold"
          style={{
            borderColor: "var(--teacher-accent-border)",
            color: "var(--teacher-accent)",
          }}
        >
          Learn
        </button>
      ) : null}
      {onEndSession ? (
        <button
          type="button"
          disabled={endSessionBusy}
          onClick={onEndSession}
          className="rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50"
          style={{
            backgroundColor: "var(--teacher-danger)",
            color: "#fff",
          }}
        >
          {endSessionBusy ? "Ending…" : "End session"}
        </button>
      ) : null}
      {onLeaveClassroom ? (
        <button
          type="button"
          onClick={onLeaveClassroom}
          className="rounded-md border px-2.5 py-1 text-xs font-bold"
          style={{
            borderColor: "var(--teacher-border)",
            color: "var(--teacher-fg)",
          }}
        >
          Leave classroom
        </button>
      ) : null}
      {joined ? (
        <button
          type="button"
          onClick={() => void leave()}
          className="rounded-md px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: "var(--teacher-danger)",
            color: "#fff",
          }}
        >
          Leave video
        </button>
      ) : null}
    </div>
  );

  // Single shell + containerRef — Learn = in-flow full-height left rail; Meeting = fixed stage.
  const shellClass = isStage
    ? "pointer-events-auto fixed inset-0 z-40 flex flex-col overflow-hidden"
    : "pointer-events-auto relative z-20 flex h-dvh w-[min(42vw,400px)] min-w-[240px] max-w-[420px] shrink-0 flex-col overflow-hidden border-r";

  const frameHeightClass = "min-h-0 w-full flex-1";

  const shellStyle = {
    ...themeVars,
    backgroundColor: "var(--teacher-bg)",
    color: "var(--teacher-fg)",
    borderColor: "var(--teacher-border)",
  } as CSSProperties;

  return (
    <>
      {showEntryGate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{
            ...themeVars,
            backgroundColor: "color-mix(in srgb, var(--teacher-bg) 92%, transparent)",
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border px-6 py-8 text-center shadow-2xl"
            style={{
              borderColor: "var(--teacher-border)",
              backgroundColor: "var(--teacher-elevated)",
              color: "var(--teacher-fg)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--teacher-accent)" }}
            >
              Live class
            </p>
            <h2 className="mt-2 text-xl font-bold">{entryStepLabel}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--teacher-muted)" }}>
              {phase === "disabled"
                ? error ??
                  "Video isn’t configured on this server. You can continue without it."
                : phase === "error"
                  ? error ?? "Check your camera/mic permissions, then try again."
                  : "We’ll keep this connection when you switch Meeting and Learn."}
            </p>
            <div
              className="mt-6 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--teacher-border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${entryProgress}%`,
                  backgroundColor: "var(--teacher-primary-btn)",
                }}
              />
            </div>
            {phase === "probing" ||
            phase === "connecting" ||
            phase === "ready" ||
            pendingConnect ? (
              <p className="mt-4 text-xs" style={{ color: "var(--teacher-subtle)" }}>
                Please wait…
              </p>
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
                      className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--teacher-primary-btn)",
                        color: "var(--teacher-primary-btn-fg)",
                      }}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void retryProbe()}
                      className="rounded-lg border px-4 py-2 text-sm font-bold"
                      style={{
                        borderColor: "var(--teacher-border)",
                        color: "var(--teacher-fg)",
                      }}
                    >
                      Recheck
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void retryProbe()}
                    className="rounded-lg border px-4 py-2 text-sm font-bold"
                    style={{
                      borderColor: "var(--teacher-border)",
                      color: "var(--teacher-fg)",
                    }}
                  >
                    Recheck
                  </button>
                )}
                <button
                  type="button"
                  onClick={phase === "disabled" ? dismissDisabled : skipEntry}
                  className="rounded-lg px-4 py-2 text-sm font-bold"
                  style={{ color: "var(--teacher-muted)" }}
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
              : "pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/95 p-4"
          }
        >
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 shadow-lg">
            <p className="text-xs font-bold text-amber-950">Class video unavailable</p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-900">
              {error ??
                "Daily video is not configured on this server (missing API key or disabled)."}
              {isHost
                ? " Students will not see class video until this is fixed."
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
        style={shellStyle}
        aria-hidden={showEntryGate}
      >
        {showDockChrome ? (
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
            style={{
              borderColor: "var(--teacher-border)",
              backgroundColor: "var(--teacher-elevated)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--teacher-muted)" }}
            >
              {isStage ? "Meeting" : "Class video"}
            </p>
            {controlButtons}
          </div>
        ) : null}
        {showDockChrome && isHost && hostNote ? (
          <p
            className="shrink-0 border-b px-3 py-1.5 text-[11px]"
            style={{
              borderColor: "var(--teacher-border)",
              color: "var(--teacher-muted)",
              backgroundColor: "var(--teacher-panel)",
            }}
          >
            {hostNote}{" "}
            {hostNoteKind === "transcript" ? (
              <a
                href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}/transcript`}
                className="font-bold underline"
                style={{ color: "var(--teacher-accent)" }}
              >
                Review transcript
              </a>
            ) : null}
            {hostNoteKind === "recording" ? (
              <a
                href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}/recording`}
                className="font-bold underline"
                style={{ color: "var(--teacher-accent)" }}
              >
                Review recording
              </a>
            ) : null}
          </p>
        ) : null}
        <div
          ref={containerRef}
          className={frameHeightClass}
          style={{ backgroundColor: "var(--teacher-bg)" }}
        />
        {showDockChrome && error ? (
          <p
            className="shrink-0 border-t px-3 py-2 text-xs"
            style={{
              borderColor: "var(--teacher-error-border)",
              backgroundColor: "var(--teacher-error-bg)",
              color: "var(--teacher-error-fg)",
            }}
          >
            {error}
          </p>
        ) : null}
        {showDockChrome && !joined && phase !== "connecting" && phase !== "prejoin" ? (
          <div
            className="flex shrink-0 flex-wrap gap-2 border-t px-3 py-2"
            style={{
              borderColor: "var(--teacher-border)",
              backgroundColor: "var(--teacher-elevated)",
            }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={requestConnect}
              className="rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              style={{
                backgroundColor: "var(--teacher-primary-btn)",
                color: "var(--teacher-primary-btn-fg)",
              }}
            >
              {phase === "error" ? "Retry connect" : "Connect"}
            </button>
            {phase === "error" ? (
              <button
                type="button"
                onClick={() => void retryProbe()}
                className="rounded-md border px-3 py-1.5 text-xs font-bold"
                style={{
                  borderColor: "var(--teacher-border)",
                  color: "var(--teacher-fg)",
                }}
              >
                Recheck
              </button>
            ) : null}
          </div>
        ) : null}
        {showDockChrome && phase === "prejoin" ? (
          <p
            className="shrink-0 border-t px-3 py-2 text-xs"
            style={{
              borderColor: "var(--teacher-border)",
              color: "var(--teacher-muted)",
              backgroundColor: "var(--teacher-elevated)",
            }}
          >
            Check camera and mic, then click Join in the video panel.
          </p>
        ) : null}
        {showDockChrome && phase === "connecting" ? (
          <p
            className="shrink-0 border-t px-3 py-2 text-xs"
            style={{
              borderColor: "var(--teacher-border)",
              color: "var(--teacher-muted)",
              backgroundColor: "var(--teacher-elevated)",
            }}
          >
            Connecting to video…
          </p>
        ) : null}
      </div>
    </>
  );
}
