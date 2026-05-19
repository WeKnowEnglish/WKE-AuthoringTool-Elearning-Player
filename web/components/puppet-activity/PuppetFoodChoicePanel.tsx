"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { unopt } from "@/components/lesson/interactions/shared";
import { playSfx } from "@/lib/audio/sfx";
import { prepareSpeechSynthesis, speakTextAndWait, unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  captionLayoutStyle,
  type PuppetCaptionLayout,
} from "@/lib/puppet-activity/caption-layout";
import type { PuppetFoodOption } from "@/lib/puppet-activity/food-options";
import { useEffect, useRef } from "react";

type Props = {
  prompt: string;
  options: PuppetFoodOption[];
  layout: PuppetCaptionLayout;
  muted: boolean;
  ttsLang: string;
  onPick: (option: PuppetFoodOption) => void;
  className?: string;
};

export function PuppetFoodChoicePanel({
  prompt,
  options,
  layout,
  muted,
  ttsLang,
  onPick,
  className,
}: Props) {
  const spokeRef = useRef(false);

  useEffect(() => {
    if (spokeRef.current) return;
    spokeRef.current = true;
    prepareSpeechSynthesis();
    void speakTextAndWait(prompt, { lang: ttsLang, muted });
  }, [prompt, ttsLang, muted]);

  return (
    <div
      className={clsx("absolute z-20 origin-center", className)}
      style={captionLayoutStyle(layout)}
      data-puppet-food-choice
    >
      <KidPanel className="border-4 border-kid-ink bg-[#fff8e1] px-3 py-3 shadow-[4px_4px_0_#0a2f86] sm:px-4 sm:py-4">
        <p className="mb-3 text-center text-lg font-extrabold text-kid-ink sm:text-xl">
          {prompt}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="flex flex-col items-center gap-1 rounded-xl border-4 border-kid-ink bg-white p-1.5 shadow-[3px_3px_0_#152668] transition-transform hover:scale-[1.03] active:scale-95 sm:p-2"
              onClick={() => {
                if (!muted) unlockSpeechSynthesis();
                playSfx("tap", muted);
                onPick(opt);
              }}
            >
              <span className="relative aspect-square w-full max-w-[5.5rem] overflow-hidden rounded-lg bg-[#dbeafe]">
                {opt.imageUrl.trim() ?
                  <Image
                    src={opt.imageUrl}
                    alt={opt.label}
                    fill
                    unoptimized={unopt(opt.imageUrl)}
                    className="object-contain p-1"
                    sizes="88px"
                  />
                : <span className="flex size-full items-center justify-center text-2xl" aria-hidden>
                    🍽
                  </span>
                }
              </span>
              <span className="text-xs font-extrabold capitalize text-kid-ink sm:text-sm">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </KidPanel>
    </div>
  );
}
