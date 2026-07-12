"use client";

import Image from "next/image";
import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { VictoryResourceStats } from "@/lib/live-game/hooks/useLiveGameVictoryStats";
import { ENGLISH_CRAFT_ART } from "@/lib/live-game/modes/english-craft/english-craft-art";

const RESOURCE_ROWS: Array<{
  type: LiveGameResourceType;
  label: string;
  icon: string;
}> = [
  { type: "wood", label: "Wood", icon: ENGLISH_CRAFT_ART.logs },
  { type: "stone", label: "Stone", icon: ENGLISH_CRAFT_ART.stoneResource },
  { type: "wheat", label: "Wheat", icon: ENGLISH_CRAFT_ART.wheatResource },
  { type: "cotton", label: "Cotton", icon: ENGLISH_CRAFT_ART.cottonResource },
];

type Props = {
  completedByName: string | null;
  resourceStats: VictoryResourceStats;
  isHost: boolean;
  onPlayAgain?: () => void;
};

function ResourceStatRow({
  label,
  icon,
  gathered,
  inStorage,
}: {
  label: string;
  icon: string;
  gathered: number;
  inStorage: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 font-bold text-kid-ink/70">
        <span className="relative inline-block h-4 w-4 shrink-0">
          <Image
            src={icon}
            alt=""
            fill
            className="object-contain"
            sizes="16px"
            unoptimized
            draggable={false}
          />
        </span>
        {label}
      </dt>
      <dd className="font-semibold tabular-nums text-kid-ink">
        {gathered} gathered · {inStorage} in storage
      </dd>
    </div>
  );
}

export function LiveGameVictoryOverlay({
  completedByName,
  resourceStats,
  isHost,
  onPlayAgain,
}: Props) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <KidConfetti active />
      <div
        className="w-full max-w-md rounded-2xl border-4 border-kid-ink bg-white p-6 text-center shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-game-victory-title"
      >
        <h2 id="live-game-victory-title" className="text-3xl font-extrabold text-kid-ink">
          Team win!
        </h2>
        <p className="mt-2 text-lg font-semibold text-kid-ink/80">
          English Craft complete — great teamwork!
        </p>

        <dl className="mt-5 space-y-2 rounded-xl border-2 border-kid-ink/20 bg-kid-surface-muted px-4 py-3 text-left text-sm">
          {completedByName ?
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-kid-ink/70">Flag touched by</dt>
              <dd className="font-semibold text-kid-ink">{completedByName}</dd>
            </div>
          : null}
          {RESOURCE_ROWS.map((row) => (
            <ResourceStatRow
              key={row.type}
              label={row.label}
              icon={row.icon}
              gathered={resourceStats.gathered[row.type]}
              inStorage={resourceStats.pool[row.type]}
            />
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {isHost && onPlayAgain ?
            <KidButton variant="primary" onClick={onPlayAgain}>
              Play again
            </KidButton>
          : null}
          <Link href="/live-game">
            <KidButton variant="secondary">Leave</KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
