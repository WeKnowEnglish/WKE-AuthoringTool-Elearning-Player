"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { PlayerPawn } from "@/components/board-game/PlayerPawn";
import { hopTransitionSeconds, prefersReducedMotion } from "@/lib/board-game/animation-timing";
import type { PawnOnTile } from "@/lib/board-game/pawn-utils";

type Props = {
  pawns: PawnOnTile[];
  pathIndex: number;
  currentPlayerIndex: number;
  landingBounce?: boolean;
  compact?: boolean;
};

function TilePawnItem({
  pawn,
  pathIndex,
  isCurrent,
  landingBounce,
  compact,
}: {
  pawn: PawnOnTile;
  pathIndex: number;
  isCurrent: boolean;
  landingBounce: boolean;
  compact?: boolean;
}) {
  const [landingLift, setLandingLift] = useState(0);
  const hopSeconds = hopTransitionSeconds();
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (!landingBounce || !isCurrent) {
      setLandingLift(0);
      return;
    }

    setLandingLift(-10);
    const resetTimer = window.setTimeout(() => setLandingLift(0), 180);
    return () => window.clearTimeout(resetTimer);
  }, [isCurrent, landingBounce]);

  return (
    <motion.div
      key={`${pawn.player.id}-${pathIndex}`}
      initial={reducedMotion ? false : { scale: 0.88, y: 6, opacity: 0.9 }}
      animate={{ scale: 1, y: landingLift, opacity: 1 }}
      transition={{
        scale: { duration: hopSeconds, ease: "easeOut" },
        y: { duration: landingBounce && isCurrent ? 0.18 : hopSeconds, ease: "easeOut" },
        opacity: { duration: hopSeconds * 0.6, ease: "easeOut" },
      }}
      className="relative z-10 shrink-0"
    >
      <PlayerPawn
        player={pawn.player}
        isCurrent={isCurrent}
        size={compact ? "sm" : "md"}
        offsetIndex={pawn.offsetIndex}
      />
    </motion.div>
  );
}

export function TilePawnSlot({
  pawns,
  pathIndex,
  currentPlayerIndex,
  landingBounce = false,
  compact,
}: Props) {
  if (pawns.length === 0) {
    return <div className={compact ? "min-h-6" : "min-h-8"} aria-hidden />;
  }

  return (
    <div className="relative z-10 flex min-h-6 items-end justify-center gap-0.5">
      {pawns.map((pawn) => (
        <TilePawnItem
          key={pawn.player.id}
          pawn={pawn}
          pathIndex={pathIndex}
          isCurrent={pawn.playerIndex === currentPlayerIndex}
          landingBounce={landingBounce}
          compact={compact}
        />
      ))}
    </div>
  );
}
