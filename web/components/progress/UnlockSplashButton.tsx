"use client";

import { clsx } from "clsx";
import {
  isUnlockAvailable,
  minLevelForUnlock,
  type UnlockId,
} from "@/lib/progress/unlock-registry";

type Props = {
  unlockId: UnlockId;
  playerLevel: number;
  label: string;
  className?: string;
  lockedClassName?: string;
  onLockedClick?: () => void;
  onClick: () => void;
  children?: React.ReactNode;
};

export function UnlockSplashButton({
  unlockId,
  playerLevel,
  label,
  className,
  lockedClassName,
  onLockedClick,
  onClick,
  children,
}: Props) {
  const minLevel = minLevelForUnlock(unlockId);
  const locked = !isUnlockAvailable(unlockId, playerLevel);

  return (
    <button
      type="button"
      disabled={locked}
      aria-label={locked ? `${label} — unlocks at level ${minLevel}` : label}
      className={clsx(
        className,
        locked &&
          (lockedClassName ??
            "cursor-not-allowed opacity-55 grayscale hover:opacity-55 active:scale-100"),
      )}
      onClick={() => {
        if (locked) {
          onLockedClick?.();
          return;
        }
        onClick();
      }}
    >
      {children ?? label}
      {locked ? (
        <span className="mt-1 block text-sm font-bold text-kid-ink/90">Level {minLevel}</span>
      ) : null}
    </button>
  );
}
