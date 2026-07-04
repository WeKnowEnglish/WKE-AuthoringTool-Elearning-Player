"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useBoardLayout } from "@/components/board-game/BoardLayoutContext";
import { PlayerPawn } from "@/components/board-game/PlayerPawn";
import {
  hopTransitionSeconds,
  jumpTransitionSeconds,
} from "@/lib/board-game/animation-timing";
import { pawnAnchorWithin, pawnTopLeftFromAnchor } from "@/lib/board-game/board-coords";
import type { TravelHop } from "@/lib/board-game/travel-state";
import type { Player } from "@/lib/board-game/types";

type Props = {
  player: Player;
  isCurrent: boolean;
  travelHop: TravelHop;
  stackOffsetX?: number;
  compact?: boolean;
};

function pawnDimensions(compact?: boolean) {
  return compact ? { width: 32, height: 32 } : { width: 40, height: 40 };
}

export function TravelPawnLayer({
  player,
  isCurrent,
  travelHop,
  stackOffsetX = 0,
  compact,
}: Props) {
  const { boardRef, getSpaceElement } = useBoardLayout();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [liftY, setLiftY] = useState(0);
  const { width, height } = pawnDimensions(compact);
  const duration =
    travelHop.mode === "jump" ? jumpTransitionSeconds() : hopTransitionSeconds();

  useEffect(() => {
    function measureAndAnimate() {
      const board = boardRef.current;
      if (!board) return;

      const fromEl = getSpaceElement(travelHop.fromPathIndex);
      const toEl = getSpaceElement(travelHop.toPathIndex);
      if (!fromEl || !toEl) return;

      const fromAnchor = pawnAnchorWithin(fromEl, board, stackOffsetX, height);
      const toAnchor = pawnAnchorWithin(toEl, board, stackOffsetX, height);
      const fromPos = pawnTopLeftFromAnchor(fromAnchor, width, height);
      const toPos = pawnTopLeftFromAnchor(toAnchor, width, height);

      setPosition(fromPos);
      setLiftY(0);

      if (duration <= 0) {
        setPosition(toPos);
        return;
      }

      window.requestAnimationFrame(() => {
        setPosition(toPos);
        setLiftY(travelHop.mode === "jump" ? -14 : -8);
      });

      window.setTimeout(() => setLiftY(0), duration * 500);
    }

    measureAndAnimate();
    window.addEventListener("resize", measureAndAnimate);
    const observer = new ResizeObserver(measureAndAnimate);
    if (boardRef.current) observer.observe(boardRef.current);

    return () => {
      window.removeEventListener("resize", measureAndAnimate);
      observer.disconnect();
    };
  }, [
    boardRef,
    duration,
    getSpaceElement,
    height,
    stackOffsetX,
    travelHop.fromPathIndex,
    travelHop.hopKey,
    travelHop.mode,
    travelHop.toPathIndex,
    width,
  ]);

  if (position === null) return null;

  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      initial={false}
      animate={{
        left: position.left,
        top: position.top,
        y: liftY,
      }}
      transition={{
        left: { duration, ease: travelHop.mode === "jump" ? "easeInOut" : "easeOut" },
        top: { duration, ease: travelHop.mode === "jump" ? "easeInOut" : "easeOut" },
        y: { duration: duration * 0.45, ease: "easeOut" },
      }}
    >
      <PlayerPawn player={player} isCurrent={isCurrent} size={compact ? "sm" : "md"} />
    </motion.div>
  );
}
