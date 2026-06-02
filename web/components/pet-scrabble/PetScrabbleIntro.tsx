"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { speakText, stopSpeaking } from "@/lib/audio/tts";
import {
  SCRABBLE_MINIGAME_INTRO_PET_DISPLAY_SCALE,
  SCRABBLE_MINIGAME_INTRO_PET_LAYOUT,
} from "@/lib/pet/animated-pet";
import { SCRABBLE_PRELOAD_URLS } from "@/lib/scrabble/scrabble-assets";

const INTRO_VOICE = "Let's play word games with your pet!";
const AUTO_CONTINUE_MS = 3200;

function preloadScrabbleImages(): Promise<void> {
  return Promise.all(
    SCRABBLE_PRELOAD_URLS.map(
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

export function PetScrabbleIntro({ muted, onFinished }: Props) {
  const [exiting, setExiting] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    speakText(INTRO_VOICE, { muted });
    preloadScrabbleImages()
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
            className="absolute inset-2 -z-10 rounded-[2.5rem] border-4 border-emerald-200/80 bg-gradient-to-b from-emerald-100/95 to-amber-100/90 shadow-lg"
          />
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: SCRABBLE_MINIGAME_INTRO_PET_LAYOUT.leftPx,
              bottom: SCRABBLE_MINIGAME_INTRO_PET_LAYOUT.bottomPx,
              transform: `translate(${SCRABBLE_MINIGAME_INTRO_PET_LAYOUT.translateXPx}px, ${SCRABBLE_MINIGAME_INTRO_PET_LAYOUT.translateYPx}px)`,
            }}
          >
            <AnimatedPet
              mood="playful"
              size="lg"
              displayScale={SCRABBLE_MINIGAME_INTRO_PET_DISPLAY_SCALE}
              displayAnchor="bottom"
            />
          </div>
        </div>
        <div className={clsx(!exiting && "pet-scrabble-intro-group")}>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-kid-ink sm:text-4xl">
            Scrabble with your pet!
          </h2>
          <p className="mt-2 max-w-xs text-sm font-semibold text-kid-ink/85">
            Take turns and spell six words together on the board.
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
