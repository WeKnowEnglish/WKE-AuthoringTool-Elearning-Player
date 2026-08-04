"use client";

import { useEffect, useState } from "react";
import { useDailyCall } from "@/components/virtual-classroom/daily/useDailyCall";

type Props = {
  sessionId: string;
  isHost: boolean;
  sessionEnded: boolean;
};

function autoPromptStorageKey(sessionId: string) {
  return `wke-daily-host-prompt:${sessionId}`;
}

function disabledDismissKey(sessionId: string) {
  return `wke-daily-disabled-dismiss:${sessionId}`;
}

/**
 * Collapsible Daily Prebuilt dock (Phase 2c UX).
 * - Visible banner when Daily is disabled/misconfigured
 * - Host auto-opens Video once per session
 * - Mobile position clears the host bottom toolbar
 * - Token refresh keeps the same Prebuilt frame
 */
export function DailyVideoDock({ sessionId, isHost, sessionEnded }: Props) {
  const {
    phase,
    error,
    expanded,
    setExpanded,
    containerRef,
    connect,
    leave,
    retryProbe,
  } = useDailyCall({ sessionId, isHost, sessionEnded });
  const [pendingConnect, setPendingConnect] = useState(false);
  const [disabledDismissed, setDisabledDismissed] = useState(false);

  useEffect(() => {
    try {
      setDisabledDismissed(
        sessionStorage.getItem(disabledDismissKey(sessionId)) === "1",
      );
    } catch {
      setDisabledDismissed(false);
    }
  }, [sessionId]);

  const busy = phase === "connecting" || phase === "probing";
  const joined = phase === "joined";
  const showFrameShell =
    expanded || joined || phase === "connecting" || pendingConnect;

  useEffect(() => {
    if (!pendingConnect || !showFrameShell) return;
    if (!containerRef.current) return;
    setPendingConnect(false);
    void connect();
  }, [pendingConnect, showFrameShell, containerRef, connect]);

  // Host-only: auto-open Video once per session when Daily is ready.
  useEffect(() => {
    if (!isHost || sessionEnded) return;
    if (phase !== "ready") return;
    try {
      if (sessionStorage.getItem(autoPromptStorageKey(sessionId)) === "1") return;
      sessionStorage.setItem(autoPromptStorageKey(sessionId), "1");
    } catch {
      // private mode — still prompt once this mount
    }
    setExpanded(true);
    setPendingConnect(true);
  }, [isHost, sessionEnded, phase, sessionId, setExpanded]);

  const requestConnect = () => {
    setExpanded(true);
    setPendingConnect(true);
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
    if (disabledDismissed) return null;
    return (
      <div
        className={`pointer-events-auto fixed z-40 max-w-[min(100vw-1.5rem,360px)] ${dockOffsetClass}`}
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
            <button
              type="button"
              onClick={dismissDisabled}
              className="rounded-md px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed z-40 flex max-w-[min(100vw-1.5rem,420px)] flex-col items-end gap-2 ${dockOffsetClass}`}
    >
      {showFrameShell ? (
        <div
          className={
            expanded
              ? "pointer-events-auto flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-xl"
              : `pointer-events-none fixed z-0 flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden opacity-0 ${dockOffsetClass}`
          }
          aria-hidden={!expanded}
        >
          {expanded ? (
            <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                Class video
              </p>
              <div className="flex items-center gap-2">
                {joined ? (
                  <button
                    type="button"
                    onClick={() => void leave()}
                    className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-600"
                  >
                    Leave video
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
                >
                  Minimize
                </button>
              </div>
            </div>
          ) : null}
          <div
            ref={containerRef}
            className="h-[min(36vh,260px)] w-[min(100vw-1.5rem,420px)] bg-slate-900 md:h-[min(42vh,320px)]"
          />
          {expanded && error ? (
            <p className="border-t border-slate-700 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}
          {expanded && !joined && phase !== "connecting" ? (
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
          {expanded && phase === "connecting" ? (
            <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">
              Connecting to video…
            </p>
          ) : null}
        </div>
      ) : null}

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
