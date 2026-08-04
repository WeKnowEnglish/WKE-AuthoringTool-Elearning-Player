"use client";

import { useEffect, useState } from "react";
import { useDailyCall } from "@/components/virtual-classroom/daily/useDailyCall";

type Props = {
  sessionId: string;
  isHost: boolean;
  sessionEnded: boolean;
};

/**
 * Collapsible Daily Prebuilt dock. Mount once per VC session so activity
 * overlays do not remount / tear down the call. When minimized while joined,
 * the iframe stays mounted (visually hidden) so A/V continues.
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

  if (phase === "disabled") {
    return null;
  }

  const requestConnect = () => {
    setExpanded(true);
    setPendingConnect(true);
  };

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 flex max-w-[min(100vw-1.5rem,420px)] flex-col items-end gap-2 md:bottom-4 md:right-4">
      {showFrameShell ? (
        <div
          className={
            expanded
              ? "pointer-events-auto flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-xl"
              : "pointer-events-none fixed bottom-4 right-4 z-0 flex w-[min(100vw-1.5rem,420px)] flex-col overflow-hidden opacity-0"
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
            className="h-[min(42vh,320px)] w-[min(100vw-1.5rem,420px)] bg-slate-900"
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
