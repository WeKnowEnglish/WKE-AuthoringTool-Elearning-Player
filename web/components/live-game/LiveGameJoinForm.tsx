"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import { useStudentStorageIdReady } from "@/lib/auth/use-student-storage-id-ready";
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

type Props = {
  initialCode?: string;
};

export function LiveGameJoinForm({ initialCode = "" }: Props) {
  const router = useRouter();
  const { ready: authReady, studentId } = useStudentStorageIdReady();
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

  function handleSubmit() {
    const code = joinCode.trim().toUpperCase();
    const name = displayName.trim();
    if (!authReady || !studentId) {
      setError("Please log in as a student before joining.");
      return;
    }
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
    setLiveGameSessionContext({
      sessionId: code,
      role: "player",
      displayName: name,
      color: LIVE_GAME_DEFAULT_PLAYER_COLOR,
      userId: studentId,
      avatarId,
      modeId: "english_craft",
      mapId: ENGLISH_CRAFT_MODE.defaultMapId,
      durationMinutes: normalizeEnglishCraftDurationMinutes(ENGLISH_CRAFT_MODE.defaultDurationMinutes),
    });
    router.push(`/live-game/${code}`);
  }

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-lg font-bold text-kid-ink">
        Checking login...
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
        <KidPanel className="space-y-4 text-center">
          <h1 className="text-2xl font-extrabold text-kid-ink">Student login required</h1>
          <p className="text-sm font-semibold text-kid-ink/70">
            Log in to your student account before joining a live game.
          </p>
          <Link
            href="/login"
            className="inline-block font-bold text-kid-ink underline underline-offset-2"
          >
            Go to login
          </Link>
        </KidPanel>
      </div>
    );
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

        <KidButton variant="primary" disabled={isSubmitting} onClick={handleSubmit}>
          Join lobby
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
