"use client";

import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";

export function BoardGameMultiplayerEntry() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <KidPanel className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-kid-ink">Multiplayer board game</h1>
          <p className="mt-1 text-sm font-semibold text-kid-ink/70">
            Play together on separate devices. Game board sync arrives in the next step.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/board-game/multiplayer/host">
            <KidButton variant="primary" className="w-full">
              I&apos;m the teacher
            </KidButton>
          </Link>
          <Link href="/board-game/multiplayer/join">
            <KidButton variant="secondary" className="w-full">
              Join with a code
            </KidButton>
          </Link>
        </div>

        <Link
          href="/board-game"
          className="inline-block text-sm font-bold text-kid-ink underline underline-offset-2"
        >
          Back to solo board game
        </Link>
      </KidPanel>
    </div>
  );
}
