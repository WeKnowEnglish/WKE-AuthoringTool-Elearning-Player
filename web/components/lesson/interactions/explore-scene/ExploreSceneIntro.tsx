"use client";

import Image from "next/image";
import { useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, unlockSpeechSynthesis } from "@/lib/audio/tts";
import type { ExploreSceneIntroDef } from "@/lib/explore/scenes/types";
import { unopt } from "@/components/lesson/interactions/shared";

type Props = {
  intro: ExploreSceneIntroDef;
  muted: boolean;
  onContinue: () => void;
};

export function ExploreSceneIntro({ intro, muted, onContinue }: Props) {
  useEffect(() => {
    unlockSpeechSynthesis();
    const text = intro.read_aloud_text?.trim() || intro.body_text;
    void speakText(text, { lang: "en-US", muted });
  }, [intro, muted]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center p-4">
      <KidPanel className="w-full max-w-lg text-center">
        <h2 className="text-2xl font-extrabold text-kid-ink">{intro.title}</h2>
        {intro.image_url ?
          <div className="relative mx-auto mt-4 aspect-[5/3] w-full max-w-md overflow-hidden rounded-xl border-4 border-kid-ink">
            <Image
              src={intro.image_url}
              alt=""
              fill
              className="object-cover"
              sizes="400px"
              unoptimized={unopt(intro.image_url)}
            />
          </div>
        : null}
        <p className="mt-4 text-base font-semibold leading-relaxed text-kid-ink/90">
          {intro.body_text}
        </p>
        <KidButton
          type="button"
          variant="accent"
          className="mt-6"
          onClick={() => {
            playSfx("tap", muted);
            onContinue();
          }}
        >
          Let&apos;s help!
        </KidButton>
      </KidPanel>
    </div>
  );
}
