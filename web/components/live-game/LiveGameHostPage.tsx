"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  LIVE_GAME_DEFAULT_PLAYER_COLOR,
  setLiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { ENGLISH_CRAFT_DURATION_OPTIONS, ENGLISH_CRAFT_MODE, formatEnglishCraftDurationSelectValue, normalizeEnglishCraftDurationMinutes, parseEnglishCraftDurationSelectValue, type EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";
import {
  LIVE_GAME_DEFAULT_AVATAR_ID,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";
import { LiveGameCharacterPicker } from "@/components/live-game/LiveGameCharacterPicker";

function createHostUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `host-${crypto.randomUUID()}`;
  }
  return `host-${Date.now()}`;
}

export function LiveGameHostPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Teacher");
  const [avatarId, setAvatarId] = useState<LiveGameCharacterId>(LIVE_GAME_DEFAULT_AVATAR_ID);
  const [durationMinutes, setDurationMinutes] = useState<EnglishCraftSessionDuration>(
    ENGLISH_CRAFT_MODE.defaultDurationMinutes as EnglishCraftSessionDuration,
  );
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

    const userId = createHostUserId();
    try {
      const response = await fetch("/api/live-game/sessions/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          userId,
          modeId: ENGLISH_CRAFT_MODE.id,
          durationMinutes,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        mapId?: string;
        durationMinutes?: number;
      };

      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Could not create a live game room.");
      }

      setLiveGameSessionContext({
        sessionId: payload.sessionId,
        role: "host",
        displayName: name,
        color: LIVE_GAME_DEFAULT_PLAYER_COLOR,
        userId,
        avatarId,
        modeId: ENGLISH_CRAFT_MODE.id,
        mapId: payload.mapId ?? ENGLISH_CRAFT_MODE.defaultMapId,
        durationMinutes: normalizeEnglishCraftDurationMinutes(payload.durationMinutes ?? durationMinutes ?? ENGLISH_CRAFT_MODE.defaultDurationMinutes),
      });

      router.push(`/live-game/${payload.sessionId}`);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Could not create a live game room.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8">
      <KidPanel className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-kid-ink">Host Live Game</h1>
          <p className="mt-1 text-sm font-semibold text-kid-ink/70">
            Mode: {ENGLISH_CRAFT_MODE.title} — {ENGLISH_CRAFT_MODE.subtitle}
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

        <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Session length (minutes)</span>
          <select
            value={formatEnglishCraftDurationSelectValue(durationMinutes)}
            onChange={(event) =>
              setDurationMinutes(parseEnglishCraftDurationSelectValue(event.target.value))
            }
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
          >
            {ENGLISH_CRAFT_DURATION_OPTIONS.map((mins) => (
              <option key={mins} value={mins}>
                {mins} minutes
              </option>
            ))}
          </select>
        </label>

        <LiveGameCharacterPicker value={avatarId} onChange={setAvatarId} />

        {error ?
          <p className="text-sm font-semibold text-red-700">{error}</p>
        : null}

        <KidButton variant="primary" disabled={isSubmitting} onClick={() => void handleCreate()}>
          {isSubmitting ? "Creating..." : "Create English Craft room"}
        </KidButton>

        <Link
          href="/live-game"
          className="inline-block text-sm font-bold text-kid-ink underline underline-offset-2"
        >
          Back
        </Link>
      </KidPanel>
    </div>
  );
}
