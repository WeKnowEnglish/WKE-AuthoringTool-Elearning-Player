"use client";

import { useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { DailyQuestsPanel } from "@/components/teststartpage/DailyQuestsPanel";
import { playSfx } from "@/lib/audio/sfx";

type Props = {
  open: boolean;
  muted: boolean;
  dailyQuestUiKey: number;
  onClose: () => void;
  onEconomyChange: () => void;
};

export function DailyQuestsDrawer({
  open,
  muted,
  dailyQuestUiKey,
  onClose,
  onEconomyChange,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] cursor-default bg-black/40 [touch-action:manipulation]"
        aria-label="Close quests"
        onPointerDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <aside
        id="daily-quests-menu"
        className="fixed right-0 top-0 z-[71] flex h-dvh w-full max-w-sm flex-col border-l-4 border-kid-ink bg-[#f7bf4d] shadow-2xl sm:rounded-l-2xl"
        aria-label="Daily quests"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-kid-ink">
            <span className="text-xl leading-none" aria-hidden>
              📜
            </span>
            Daily quests
          </span>
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
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <DailyQuestsPanel
            key={dailyQuestUiKey}
            muted={muted}
            embedded
            onEconomyChange={onEconomyChange}
          />
        </div>
      </aside>
    </>
  );
}
