"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import {
  LIVE_GAME_DEFAULT_PLAYER_COLOR,
  setLiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { isValidJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { ENGLISH_CRAFT_MODE, normalizeEnglishCraftDurationMinutes } from "@/lib/live-game/modes/english-craft/config";
import {
  LIVE_GAME_DEFAULT_AVATAR_ID,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";
import { LiveGameCharacterPicker } from "@/components/live-game/LiveGameCharacterPicker";
import { DEFAULT_LIVE_GAME_QUESTION_SET_UUID } from "@/lib/live-game/question-banks/question-set-ids";

type Props = {
  initialCode?: string;
};

export function LiveGameJoinForm({ initialCode = "" }: Props) {
  const router = useRouter();
  const { displayName: studentName, ready: nameReady } = useStudentDisplayName();
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState<LiveGameCharacterId>(LIVE_GAME_DEFAULT_AVATAR_ID);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (nameReady && studentName && !displayName) {
      setDisplayName(studentName);
    }
  }, [displayName, nameReady, studentName]);

  async function handleSubmit() {
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
    try {
      const response = await fetch("/api/live-game/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: code, displayName: name, avatarId }),
      });
      const payload = (await response.json()) as {
        error?: string; userId?: string; mapId?: string; durationMinutes?: number | null;
        questionSetId?: string; questionSetVersion?: number;
      };
      if (!response.ok || !payload.userId) throw new Error(payload.error ?? "Could not join game.");
      setLiveGameSessionContext({
        sessionId: code,
        role: "player",
        displayName: name,
        color: LIVE_GAME_DEFAULT_PLAYER_COLOR,
        userId: payload.userId,
        avatarId,
        modeId: "english_craft",
        mapId: payload.mapId ?? ENGLISH_CRAFT_MODE.defaultMapId,
        durationMinutes: normalizeEnglishCraftDurationMinutes(
          typeof payload.durationMinutes === "number" ? payload.durationMinutes : ENGLISH_CRAFT_MODE.defaultDurationMinutes,
        ),
        questionSetId: payload.questionSetId ?? DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
        questionSetVersion: payload.questionSetVersion ?? 1,
      });
      router.push(`/live-game/${code}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join game.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8">
      <KidPanel className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-kid-ink">Join Live Game</h1>
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

        <LiveGameCharacterPicker value={avatarId} onChange={setAvatarId} />

        {error ?
          <p className="text-sm font-semibold text-red-700">{error}</p>
        : null}

        <KidButton variant="primary" disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {isSubmitting ? "Joining..." : "Join lobby"}
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
