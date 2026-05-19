"use client";

import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PortalLoginModal } from "@/components/auth/PortalLoginModal";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import {
  LEARNING_BANDS,
  learningBandLabel,
  type LearningBand,
} from "@/lib/learning-band";
import { getProgressSnapshot } from "@/lib/progress/local-storage";

export function LevelLandingClient() {
  const [selected, setSelected] = useState<LearningBand>("a1");
  const [loginOpen, setLoginOpen] = useState(false);

  function onSelect(band: LearningBand) {
    playSfx("tap", getProgressSnapshot().audioMuted === true);
    setSelected(band);
    setLoginOpen(true);
  }

  function onContinue() {
    playSfx("tap", getProgressSnapshot().audioMuted === true);
    setLoginOpen(true);
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-[#38bdf8] text-kid-ink">
        <header className="relative z-20 flex items-center justify-between gap-3 border-b-4 border-kid-ink/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
          <p className="text-lg font-extrabold tracking-tight text-kid-ink">We Know English</p>
          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
            <Link
              href="/login?portal=teacher"
              className="rounded-md border-2 border-kid-ink px-3 py-1.5 transition-transform [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.97]"
            >
              Teacher sign in
            </Link>
          </nav>
        </header>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <Image
              src="/landing/hero.svg"
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14532d]/75 via-[#14532d]/20 to-transparent"
              aria-hidden
            />
          </div>

          <div className="relative z-10 flex h-full min-h-[min(72dvh,640px)] flex-col justify-end px-4 pb-10 pt-6 sm:px-8 sm:pb-14">
            <div className="mx-auto w-full max-w-xl space-y-5 text-center">
              <div className="space-y-2 drop-shadow-sm">
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                  Pick your English level
                </h1>
                <p className="text-base font-semibold text-white/95 sm:text-lg">
                  Tap a level, then sign in or create your account to save progress.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="English level"
                className="mx-auto flex rounded-2xl border-4 border-kid-ink bg-white/95 p-1 shadow-lg backdrop-blur-sm"
              >
                {LEARNING_BANDS.map((band) => {
                  const active = selected === band;
                  return (
                    <button
                      key={band}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={clsx(
                        "min-h-12 flex-1 rounded-xl border-2 px-3 py-2 text-lg font-extrabold transition-[transform,background-color] duration-100 [touch-action:manipulation] motion-reduce:transition-none sm:min-h-14 sm:text-xl",
                        active ?
                          "scale-[1.02] border-kid-ink bg-[#f7bf4d] text-kid-ink shadow-sm"
                        : "border-transparent bg-transparent text-kid-ink/80 hover:bg-kid-surface-muted active:scale-[0.98]",
                      )}
                      onClick={() => onSelect(band)}
                    >
                      {learningBandLabel(band)}
                    </button>
                  );
                })}
              </div>

              <KidButton
                type="button"
                variant="accent"
                className="mx-auto w-full max-w-xs !min-h-[3.25rem] !text-lg shadow-lg"
                onClick={onContinue}
              >
                Let&apos;s go!
              </KidButton>
            </div>
          </div>
        </div>
      </div>

      <PortalLoginModal
        open={loginOpen}
        learningBand={selected}
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}
