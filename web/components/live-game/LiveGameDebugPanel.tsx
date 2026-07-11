"use client";

import { useStatus } from "@liveblocks/react/suspense";
import type { MovementState } from "@/lib/live-game/engine/movement";

type Props = {
  position: MovementState;
  remoteCount: number;
};

export function LiveGameDebugPanel({ position, remoteCount }: Props) {
  const status = useStatus();

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border-2 border-kid-ink/30 bg-black/80 p-3 font-mono text-xs text-white">
      <p className="font-bold text-lime-300">Live Game debug</p>
      <p>connection: {status}</p>
      <p>
        local: {Math.round(position.x)}, {Math.round(position.y)}
      </p>
      <p>remotes: {remoteCount}</p>
    </div>
  );
}

type BannerProps = {
  className?: string;
};

export function LiveGameConnectionBanner({ className }: BannerProps) {
  const status = useStatus();
  if (status !== "reconnecting" && status !== "disconnected") return null;

  return (
    <div
      className={
        className ??
        "rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
      }
    >
      {status === "reconnecting" ?
        "Connection lost — reconnecting..."
      : "Disconnected from the game room. Refresh to rejoin."}
    </div>
  );
}
