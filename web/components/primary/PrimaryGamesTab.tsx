"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Lock, PawPrint, Sprout } from "lucide-react";
import { GardenLockedPanel } from "@/components/garden/GardenLockedPanel";
import { GardenRoom } from "@/components/garden/GardenRoom";
import { PetRoom } from "@/components/student-hub/PetRoom";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import { isStudyCarePending } from "@/lib/pet";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

type GameId = "pet" | "garden";

type Props = {
  playerLevel: number;
  onEconomyChange?: () => void;
  onGoLearn?: () => void;
};

export function PrimaryGamesTab({ playerLevel, onEconomyChange, onGoLearn }: Props) {
  const hydrated = useClientHydrated();
  const { muted } = useAudioMuted();
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [petUiKey, setPetUiKey] = useState(0);
  const [gardenUiKey, setGardenUiKey] = useState(0);

  const gardenUnlocked = isUnlockAvailable("language_garden", playerLevel);
  const studyPending = hydrated ? isStudyCarePending() : false;

  function openGame(id: GameId) {
    if (id === "garden" && !gardenUnlocked) {
      setActiveGame("garden");
      return;
    }
    if (id === "pet") setPetUiKey((k) => k + 1);
    if (id === "garden") setGardenUiKey((k) => k + 1);
    setActiveGame(id);
  }

  function closeGame() {
    setActiveGame(null);
    onEconomyChange?.();
  }

  if (activeGame === "pet") {
    return (
      <div className="mx-auto flex h-[calc(100dvh-7.5rem)] max-w-3xl flex-col gap-3 pb-20 lg:h-[calc(100dvh-5.5rem)] lg:pb-4">
        <button
          type="button"
          onClick={closeGame}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-extrabold text-[var(--pl-purple)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All games
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PetRoom
            muted={muted}
            petUiKey={petUiKey}
            onGoLearn={() => {
              closeGame();
              onGoLearn?.();
            }}
            onGoHome={closeGame}
            onEconomyChange={onEconomyChange}
          />
        </div>
      </div>
    );
  }

  if (activeGame === "garden") {
    return (
      <div className="mx-auto flex h-[calc(100dvh-7.5rem)] max-w-5xl flex-col gap-3 pb-20 lg:h-[calc(100dvh-5.5rem)] lg:pb-4">
        <button
          type="button"
          onClick={closeGame}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-extrabold text-[var(--pl-purple)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All games
        </button>
        <div className="min-h-0 flex-1 overflow-hidden">
          {gardenUnlocked ? (
            <GardenRoom
              muted={muted}
              gardenUiKey={gardenUiKey}
              onEconomyChange={onEconomyChange}
            />
          ) : (
            <GardenLockedPanel
              playerLevel={playerLevel}
              onGoLearn={() => {
                closeGame();
                onGoLearn?.();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Games</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          Care for your pet and grow words in the Language Garden.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <button
            type="button"
            onClick={() => openGame("pet")}
            className="flex h-full w-full flex-col items-start rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-5 text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]">
              <PawPrint className="h-6 w-6" />
            </span>
            <span className="mt-4 text-lg font-extrabold">Pet Care</span>
            <span className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
              Feed, play, and claim gold when your pet is happy.
            </span>
            {studyPending ? (
              <span className="mt-3 inline-flex rounded-full bg-[var(--pl-teal)]/15 px-2.5 py-1 text-xs font-extrabold text-[var(--pl-teal)]">
                Study care ready
              </span>
            ) : null}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => openGame("garden")}
            className="flex h-full w-full flex-col items-start rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-5 text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Sprout className="h-6 w-6" />
            </span>
            <span className="mt-4 flex items-center gap-2 text-lg font-extrabold">
              Language Garden
              {!gardenUnlocked ? (
                <Lock className="h-4 w-4 text-[var(--pl-muted)]" aria-hidden />
              ) : null}
            </span>
            <span className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
              {gardenUnlocked
                ? "Plant letters, harvest words, and clear weeds."
                : `Unlocks at level ${minLevelForUnlock("language_garden")}.`}
            </span>
          </button>
        </li>
      </ul>

      <p className="text-xs font-semibold text-[var(--pl-muted)]">
        World explore is not ready here yet. You can still open the legacy world hub.
      </p>
      <Link
        href="/home"
        className="inline-flex w-fit items-center rounded-2xl border border-[var(--pl-border)] bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--pl-purple)] hover:bg-[var(--pl-purple-soft)]"
      >
        Open world hub
      </Link>
    </div>
  );
}
