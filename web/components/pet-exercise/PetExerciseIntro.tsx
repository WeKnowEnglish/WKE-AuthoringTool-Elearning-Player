"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { speakText, stopSpeaking } from "@/lib/audio/tts";
import { EXERCISE_PRELOAD_URLS } from "@/lib/exercise/exercise-tiles";
import {
  EXERCISE_MINIGAME_INTRO_PET_DISPLAY_SCALE,
  EXERCISE_MINIGAME_INTRO_PET_LAYOUT,
} from "@/lib/pet/animated-pet";

const INTRO_VOICE =
  "Let's exercise! Stack the words on the ladder to help your pet climb.";
const AUTO_CONTINUE_MS = 3200;

function preloadExerciseImages(): Promise<void> {
  return Promise.all(
    EXERCISE_PRELOAD_URLS.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  ).then(() => undefined);
}

type Props = {
  muted: boolean;
  onFinished: () => void;
};

export function PetExerciseIntro({ muted, onFinished }: Props) {
  const [exiting, setExiting] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    speakText(INTRO_VOICE, { muted });
    preloadExerciseImages()
      .then(() => {
        if (!cancelled) setAssetsReady(true);
      })
      .catch(() => {
        if (!cancelled) setAssetsReady(true);
      });
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [muted]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopSpeaking();
    setExiting(true);
    window.setTimeout(() => {
      onFinished();
    }, 320);
  }, [onFinished]);

  useEffect(() => {
    if (!assetsReady) return;
    const t = window.setTimeout(finish, AUTO_CONTINUE_MS);
    return () => clearTimeout(t);
  }, [assetsReady, finish]);

  return (
    <div
      className={clsx(
        "flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 transition-opacity duration-300",
        exiting && "opacity-0",
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mx-auto h-[15rem] w-full max-w-[16rem] overflow-visible">
          <div
            aria-hidden
            className="absolute inset-2 -z-10 rounded-[2.5rem] border-4 border-lime-200/80 bg-gradient-to-b from-lime-100/95 to-sky-100/90 shadow-lg"
          />
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: EXERCISE_MINIGAME_INTRO_PET_LAYOUT.leftPx,
              bottom: EXERCISE_MINIGAME_INTRO_PET_LAYOUT.bottomPx,
              transform: `translate(${EXERCISE_MINIGAME_INTRO_PET_LAYOUT.translateXPx}px, ${EXERCISE_MINIGAME_INTRO_PET_LAYOUT.translateYPx}px)`,
            }}
          >
            <AnimatedPet
              mood="playful"
              size="lg"
              displayScale={EXERCISE_MINIGAME_INTRO_PET_DISPLAY_SCALE}
              displayAnchor="bottom"
            />
          </div>
        </div>
        <div className={clsx(!exiting && "pet-exercise-intro-group")}>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-kid-ink sm:text-4xl">
            Climb the Ladder!
          </h2>
          <p className="mt-2 max-w-xs text-sm font-semibold text-kid-ink/85">
            Stack words from smallest to biggest so your pet can climb up.
          </p>
        </div>
      </div>

      <KidButton
        type="button"
        className="mt-8 min-w-[10rem]"
        onClick={finish}
        disabled={!assetsReady}
      >
        {assetsReady ? "Let's go!" : "Loading…"}
      </KidButton>
    </div>
  );
}
