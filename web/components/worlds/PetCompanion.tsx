"use client";

import { clsx } from "clsx";
import { StudentAvatar, type StudentAvatarSize } from "@/components/avatar/StudentAvatar";
import type { AvatarLoadout } from "@/lib/avatar/types";

type Props = {
  loadout: AvatarLoadout | null | undefined;
  playerLevel?: number;
  size?: StudentAvatarSize;
  show?: boolean;
  className?: string;
};

/** Pet avatar anchored beside the player (follower pose). */
export function PetCompanion({
  loadout,
  playerLevel = 1,
  size = "sm",
  show = true,
  className,
}: Props) {
  return (
    <div
      className={clsx(
        "pointer-events-none absolute z-10",
        "right-1 bottom-[4.5rem] sm:right-2 sm:bottom-[5rem]",
        className,
      )}
      aria-hidden={!show || !loadout}
    >
      <div className="origin-bottom-right -rotate-6 scale-95 drop-shadow-[2px_3px_0_rgba(21,38,104,0.25)]">
        <StudentAvatar
          loadout={loadout}
          playerLevel={playerLevel}
          size={size}
          show={show && Boolean(loadout)}
        />
      </div>
    </div>
  );
}
