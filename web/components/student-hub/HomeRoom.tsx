"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { KidButton } from "@/components/kid-ui/KidButton";
import { PlayerLevelBar } from "@/components/progress/PlayerLevelBar";
import { playSfx } from "@/lib/audio/sfx";
import { AVATAR_PRESETS } from "@/lib/avatar/defaults";
import { growthStageForPreset, robotGrowthLabel } from "@/lib/avatar/growth";
import { presetIdForLoadout } from "@/lib/avatar/progress";
import { levelFromXp } from "@/lib/progress/leveling";
import type { AvatarLoadout } from "@/lib/avatar/types";
import { getChosenAvatarLoadout } from "@/lib/progress/local-storage";
import { getRewards } from "@/lib/progress/rewards";
import type { StickerDef } from "@/lib/progress/sticker-library";
import { STICKER_LIBRARY } from "@/lib/progress/sticker-library";

type Props = {
  muted: boolean;
  experience: number;
  hydrated: boolean;
  dailyQuestUiKey: number;
  onGoLearn: () => void;
  onGoPet: () => void;
  onGoBook: () => void;
};

function buildStickerShowcase(ownedIds: string[]): StickerDef[] {
  return ownedIds
    .slice(-6)
    .map((id) => STICKER_LIBRARY.find((s) => s.id === id))
    .filter((s): s is StickerDef => Boolean(s));
}

export function HomeRoom({
  muted,
  experience,
  hydrated,
  dailyQuestUiKey,
  onGoLearn,
  onGoPet,
  onGoBook,
}: Props) {
  const [loadout, setLoadout] = useState<AvatarLoadout | null>(null);
  const [showcase, setShowcase] = useState<StickerDef[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    setLoadout(getChosenAvatarLoadout());
    setShowcase(buildStickerShowcase(getRewards().ownedStickerIds ?? []));
  }, [hydrated, dailyQuestUiKey]);

  const displayLoadout = hydrated ? loadout : null;
  const presetId = displayLoadout ? presetIdForLoadout(displayLoadout) : null;
  const presetLabel =
    presetId ? (AVATAR_PRESETS.find((p) => p.id === presetId)?.label ?? "friend") : null;
  const playerLevel = levelFromXp(experience);
  const robotGrowth = growthStageForPreset(presetId, playerLevel);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="order-2 flex min-w-0 flex-col gap-5 sm:order-1">
        {hydrated ?
          <PlayerLevelBar experience={experience} prominent className="w-full" />
        : (
          <div
            className="h-[5.5rem] w-full rounded-2xl border-4 border-kid-ink/30 bg-kid-panel/50"
            aria-hidden
          />
        )}

        {hydrated && showcase.length > 0 ? (
          <section className="rounded-2xl border-4 border-kid-ink bg-kid-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/90">Stickers</p>
              <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-sm font-bold">
                <button
                  type="button"
                  className="text-[#0a2f86] underline decoration-2 underline-offset-2"
                  onClick={() => {
                    playSfx("tap", muted);
                    onGoBook();
                  }}
                >
                  Sticker book
                </button>
                <span className="text-kid-ink/50" aria-hidden>
                  ·
                </span>
                <Link
                  href="/profile"
                  className="text-[#0a2f86] underline decoration-2 underline-offset-2"
                >
                  See all
                </Link>
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {showcase.map((s) => (
                <li
                  key={s.id}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-kid-ink bg-white text-3xl"
                  title={s.label}
                >
                  <span aria-hidden>{s.emoji}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <KidButton type="button" variant="accent" className="w-full !min-h-[3.5rem] !text-lg" onClick={onGoLearn}>
          Go learn
        </KidButton>

        <p className="text-center text-sm font-semibold text-kid-ink/75 sm:text-left">
          <Link href="/learn" className="text-[#0a2f86] underline decoration-2 underline-offset-2">
            Lessons
          </Link>
          {" · "}
          <Link href="/profile" className="text-[#0a2f86] underline decoration-2 underline-offset-2">
            Achievements
          </Link>
        </p>
      </div>

      <aside className="order-1 flex w-full flex-col items-center gap-2 sm:order-2 sm:sticky sm:top-4 sm:w-[8.5rem]">
        {robotGrowth ?
          <p className="w-full text-center text-xs font-bold uppercase tracking-wide text-kid-ink/80">
            Stage {robotGrowth} · {robotGrowthLabel(robotGrowth)}
          </p>
        : null}

        <section className="w-full rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 text-center">
          <div className="flex justify-center" suppressHydrationWarning>
            <StudentAvatar
              loadout={displayLoadout}
              playerLevel={playerLevel}
              size="lg"
              show={hydrated && Boolean(displayLoadout)}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-kid-ink/85" suppressHydrationWarning>
            {displayLoadout ?
              `Hi, ${presetLabel ?? "friend"}!`
            : "Choose your look in Achievements"}
          </p>
          <Link
            href="/profile"
            className="mt-2 inline-block text-xs font-bold text-[#0a2f86] underline decoration-2 underline-offset-2"
            onClick={() => playSfx("tap", muted)}
          >
            {displayLoadout ? "Change look" : "Pick a look"}
          </Link>
          <button
            type="button"
            className="mt-2 block w-full text-xs font-bold text-[#0a2f86] underline decoration-2 underline-offset-2"
            onClick={() => {
              playSfx("tap", muted);
              onGoPet();
            }}
          >
            Pet Care
          </button>
        </section>
      </aside>
    </div>
  );
}
