"use client";

import { BoardGameApp } from "@/components/board-game/BoardGameApp";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";

type Props = {
  muted: boolean;
  onClose: () => void;
};

export function BoardGameOverlay({ muted, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[#f7bf4d] text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Board game"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
        <p className="min-w-0 truncate text-sm font-extrabold uppercase tracking-wide text-kid-ink">
          Board game
        </p>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-9 shrink-0 text-sm"
          onClick={() => {
            playSfx("tap", muted);
            onClose();
          }}
        >
          Close
        </KidButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <BoardGameApp />
      </div>
    </div>
  );
}

