"use client";

import Image from "next/image";
import { KidButton } from "@/components/kid-ui/KidButton";
import { ENGLISH_CRAFT_ART } from "@/lib/live-game/modes/english-craft/english-craft-art";
import { ENGLISH_CRAFT_WOOD_GOAL } from "@/lib/live-game/modes/english-craft/gameplay-v1";

type Props = {
  wood: number;
  goal?: number;
};

export function LiveGameTeamHud({ wood, goal = ENGLISH_CRAFT_WOOD_GOAL }: Props) {
  const progress = Math.min(100, Math.round((wood / goal) * 100));

  return (
    <div className="rounded-xl border-2 border-amber-300/60 bg-amber-950/80 px-3 py-2 text-amber-50 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">Team wood</p>
      <p className="flex items-center gap-1.5 text-lg font-extrabold leading-tight">
        <span className="relative inline-block h-6 w-6 shrink-0">
          <Image
            src={ENGLISH_CRAFT_ART.logs}
            alt=""
            fill
            className="object-contain"
            sizes="24px"
            unoptimized
            draggable={false}
          />
        </span>
        {wood} / {goal}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-950">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

type InteractProps = {
  label: string;
  disabled?: boolean;
  onInteract: () => void;
};

export function LiveGameInteractPrompt({ label, disabled, onInteract }: InteractProps) {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <KidButton
        type="button"
        variant="accent"
        className="!min-h-11 px-5 text-sm font-extrabold"
        disabled={disabled}
        onClick={onInteract}
      >
        {label}
      </KidButton>
      <p className="text-xs font-semibold text-white/75">Press E near a tree</p>
    </div>
  );
}
