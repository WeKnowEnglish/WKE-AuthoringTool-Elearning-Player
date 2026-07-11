"use client";

import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { clearLiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";

type Props = {
  isHost: boolean;
};

export function LiveGameSessionEndedScreen({ isHost }: Props) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-kid-surface p-4">
      <div className="w-full max-w-md rounded-2xl border-4 border-kid-ink bg-white p-6 text-center shadow-xl">
        <h1 className="text-2xl font-extrabold text-kid-ink">Session ended</h1>
        <p className="mt-2 text-base font-semibold text-kid-ink/80">
          {isHost ?
            "You closed this lobby. Students can no longer join or play here."
          : "The teacher closed this lobby."}
        </p>
        <div className="mt-6">
          <Link
            href="/live-game"
            onClick={() => {
              clearLiveGameSessionContext();
            }}
          >
            <KidButton variant="primary" className="w-full">
              Back to live games
            </KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
