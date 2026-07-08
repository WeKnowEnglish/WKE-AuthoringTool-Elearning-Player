"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { PAWN_COLORS } from "@/lib/board-game/constants";
import {
  getOrCreateLiveUserId,
  setLiveSessionContext,
} from "@/lib/board-game/liveblocks/identity";
import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";

type Props = {
  initialCode?: string;
};

export function BoardGameJoinForm({ initialCode = "" }: Props) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState<string>(PAWN_COLORS[0]?.hex ?? "#ef4444");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit() {
    const code = joinCode.trim().toUpperCase();
    const name = displayName.trim();
    if (!isValidJoinCode(code)) {
      setError("Enter a valid 6-character join code.");
      return;
    }
    if (!name) {
      setError("Enter your name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const userId = getOrCreateLiveUserId();
    setLiveSessionContext({
      sessionId: code,
      role: "player",
      displayName: name,
      color,
      userId,
    });
    router.push(`/board-game/multiplayer/${code}`);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <KidPanel className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-kid-ink">Join a game</h1>
          <p className="mt-1 text-sm font-semibold text-kid-ink/70">
            Enter the code from your teacher&apos;s screen.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Join code</span>
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            maxLength={6}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 font-mono text-xl font-bold tracking-[0.2em] text-kid-ink"
            placeholder="ABCDEF"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Your name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
            placeholder="Student name"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-bold text-kid-ink">Your color</span>
          <div className="flex flex-wrap gap-2">
            {PAWN_COLORS.map((pawn) => (
              <button
                key={pawn.id}
                type="button"
                aria-label={pawn.label}
                onClick={() => setColor(pawn.hex)}
                className={`h-10 w-10 rounded-full border-4 ${
                  color === pawn.hex ? "border-kid-ink" : "border-kid-ink/20"
                }`}
                style={{ backgroundColor: pawn.hex }}
              />
            ))}
          </div>
        </div>

        {error ?
          <p className="text-sm font-semibold text-red-700">{error}</p>
        : null}

        <KidButton variant="primary" disabled={isSubmitting} onClick={handleSubmit}>
          Join lobby
        </KidButton>

        <Link
          href="/board-game/multiplayer"
          className="inline-block text-sm font-bold text-kid-ink underline underline-offset-2"
        >
          Back
        </Link>
      </KidPanel>
    </div>
  );
}
