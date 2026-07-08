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

export function BoardGameHostPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Teacher");
  const [color, setColor] = useState<string>(PAWN_COLORS[0]?.hex ?? "#ef4444");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    const name = displayName.trim();
    if (!name) {
      setError("Enter your name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const userId = getOrCreateLiveUserId();
    try {
      const response = await fetch("/api/board-game/live/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, userId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
      };

      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Could not create a game room.");
      }

      setLiveSessionContext({
        sessionId: payload.sessionId,
        role: "host",
        displayName: name,
        color,
        userId,
      });

      router.push(`/board-game/multiplayer/${payload.sessionId}`);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Could not create a game room.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <KidPanel className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-kid-ink">Host a game</h1>
          <p className="mt-1 text-sm font-semibold text-kid-ink/70">
            Create a join code for your class. Open host is enabled for development.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Your name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
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

        <KidButton variant="primary" disabled={isSubmitting} onClick={() => void handleCreate()}>
          {isSubmitting ? "Creating..." : "Create game room"}
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
