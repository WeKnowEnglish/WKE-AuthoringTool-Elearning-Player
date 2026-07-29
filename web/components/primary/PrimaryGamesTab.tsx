"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Lock, PawPrint, Sprout } from "lucide-react";
import { GardenLockedPanel } from "@/components/garden/GardenLockedPanel";
import { GardenRoom } from "@/components/garden/GardenRoom";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
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
            className="group flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
          >
            <PetGamePreview studyPending={studyPending} />
            <span className="flex flex-col items-start p-4 pt-3 sm:p-5 sm:pt-4">
              <span className="flex items-center gap-2 text-lg font-extrabold text-[var(--pl-ink)]">
                <PawPrint className="h-5 w-5 text-[var(--pl-purple)]" aria-hidden />
                Pet Care
              </span>
              <span className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
                Feed, play, and claim gold when your pet is happy.
              </span>
              {studyPending ? (
                <span className="mt-3 inline-flex rounded-full bg-[var(--pl-teal)]/15 px-2.5 py-1 text-xs font-extrabold text-[var(--pl-teal)]">
                  Study care ready
                </span>
              ) : null}
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => openGame("garden")}
            className="group flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--pl-border)] bg-white text-left shadow-sm transition hover:border-[var(--pl-purple)]/40 hover:shadow-md active:scale-[0.99]"
          >
            <GardenGamePreview locked={!gardenUnlocked} />
            <span className="flex flex-col items-start p-4 pt-3 sm:p-5 sm:pt-4">
              <span className="flex items-center gap-2 text-lg font-extrabold text-[var(--pl-ink)]">
                <Sprout className="h-5 w-5 text-emerald-700" aria-hidden />
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
            </span>
          </button>
        </li>
      </ul>

      <p className="text-xs font-semibold text-[var(--pl-muted)]">
        World explore is coming to Primary Games soon.
      </p>
    </div>
  );
}

function PetGamePreview({ studyPending }: { studyPending: boolean }) {
  return (
    <span
      className="relative block aspect-[16/10] w-full overflow-hidden bg-gradient-to-b from-sky-100 via-[var(--pl-purple-soft)] to-amber-50"
      aria-hidden
    >
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-100/90 to-transparent" />
      <span className="absolute left-3 top-3 flex gap-1.5">
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-[var(--pl-purple)] shadow-sm">
          Feed
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-[var(--pl-teal)] shadow-sm">
          Play
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 shadow-sm">
          Gold
        </span>
      </span>
      <span className="absolute inset-0 flex items-end justify-center pb-2 sm:pb-3">
        <AnimatedPet mood="excited" size="md" displayAnchor="bottom" playing />
      </span>
      {studyPending ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-[var(--pl-teal)] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
          Ready
        </span>
      ) : null}
    </span>
  );
}

function GardenGamePreview({ locked }: { locked: boolean }) {
  return (
    <span
      className={`relative block aspect-[16/10] w-full overflow-hidden bg-gradient-to-b from-sky-100 to-emerald-100 ${
        locked ? "grayscale" : ""
      }`}
      aria-hidden
    >
      <span className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-emerald-200/90 to-transparent" />
      <span className="absolute left-3 top-3 flex gap-1.5">
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 shadow-sm">
          Plant
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 shadow-sm">
          Harvest
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-2 px-4">
        <Image
          src="/assets/tiles/grass-1.png"
          alt=""
          width={72}
          height={72}
          className="h-14 w-14 object-contain drop-shadow-sm sm:h-16 sm:w-16"
          unoptimized
        />
        <Image
          src="/assets/tiles/dirt-sprout.png"
          alt=""
          width={80}
          height={80}
          className="h-16 w-16 object-contain drop-shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]"
          unoptimized
        />
        <Image
          src="/assets/tiles/dirt-sprout-tall.png"
          alt=""
          width={80}
          height={80}
          className="h-16 w-16 object-contain drop-shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]"
          unoptimized
        />
      </span>

      <span className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1">
        {["C", "A", "T"].map((letter) => (
          <span
            key={letter}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-700/30 bg-amber-100 text-[11px] font-black text-amber-950 shadow-sm"
          >
            {letter}
          </span>
        ))}
      </span>

      {locked ? (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/25">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-[var(--pl-ink)] shadow-sm">
            <Lock className="h-3.5 w-3.5" />
            Locked
          </span>
        </span>
      ) : null}
    </span>
  );
}
