"use client";

import { clsx } from "clsx";
import { playSfx } from "@/lib/audio/sfx";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";

export type StudentHubRoom = "home" | "pet" | "garden" | "learn" | "book";

const TABS: { id: StudentHubRoom; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "pet", icon: "🐾", label: "Pet Care" },
  { id: "garden", icon: "🌿", label: "Garden" },
  { id: "learn", icon: "📖", label: "Learn" },
  { id: "book", icon: "📒", label: "Collection" },
];

type Props = {
  room: StudentHubRoom;
  muted: boolean;
  playerLevel: number;
  onRoomChange: (room: StudentHubRoom) => void;
  onGardenLocked?: () => void;
  /** `inline` sits in the page flex column (Book tab); `fixed` overlays the bottom. */
  dock?: "fixed" | "inline";
};

export function RoomSwitcher({
  room,
  muted,
  playerLevel,
  onRoomChange,
  onGardenLocked,
  dock = "fixed",
}: Props) {
  const gardenLocked = !isUnlockAvailable("language_garden", playerLevel);
  const gardenUnlockLevel = minLevelForUnlock("language_garden");

  const btnClass = (active: boolean, locked = false) =>
    clsx(
      "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center rounded-xl border-4 border-kid-ink px-1 py-2 transition-transform [touch-action:manipulation] active:scale-[0.98]",
      locked ?
        "cursor-not-allowed bg-kid-panel text-kid-ink opacity-55 grayscale"
      : active ?
        "bg-[#0f4ecf] text-white shadow-[3px_3px_0_#0a2f86]"
      : "bg-kid-panel text-kid-ink hover:bg-kid-surface-muted",
    );

  return (
    <nav
      className={clsx(
        "z-40 border-t-4 border-kid-ink bg-[#d8871f] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-3",
        dock === "fixed" ? "fixed bottom-0 left-0 right-0" : "relative w-full shrink-0",
      )}
      aria-label="Rooms"
    >
      <div className="mx-auto flex max-w-xl gap-1 sm:gap-1.5">
        {TABS.map((tab) => {
          const locked = tab.id === "garden" && gardenLocked;
          return (
            <button
              key={tab.id}
              type="button"
              className={btnClass(room === tab.id, locked)}
              aria-current={room === tab.id ? "page" : undefined}
              aria-label={
                locked ?
                  `${tab.label} — unlocks at level ${gardenUnlockLevel}`
                : tab.label
              }
              title={locked ? `Level ${gardenUnlockLevel} to unlock` : tab.label}
              onClick={() => {
                if (room === tab.id) return;
                if (locked) {
                  playSfx("wrong", muted);
                  onGardenLocked?.();
                  return;
                }
                playSfx("tap", muted);
                onRoomChange(tab.id);
              }}
            >
              <span className="text-xl leading-none sm:text-2xl" aria-hidden>
                {tab.icon}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
