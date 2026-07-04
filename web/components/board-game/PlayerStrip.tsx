"use client";

import { clsx } from "clsx";
import { motion } from "motion/react";
import { DiceRollButton } from "@/components/board-game/DiceRollButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { GameRuntime, Player } from "@/lib/board-game/types";

type Props = {
  players: Player[];
  runtime: GameRuntime;
  boardLength: number;
  currentPlayerIndex: number;
  lastRoll: number | null;
  canRoll: boolean;
  onRoll: () => void;
  idleBounce?: boolean;
  variant?: "panel" | "overlay";
};

export function PlayerStrip({
  players,
  runtime,
  boardLength,
  currentPlayerIndex,
  lastRoll,
  canRoll,
  onRoll,
  idleBounce = false,
  variant = "panel",
}: Props) {
  const isOverlay = variant === "overlay";

  const cards = (
    <div
      className={clsx(
        "flex gap-2",
        isOverlay ? "flex-nowrap overflow-x-auto pb-0.5" : "flex-wrap gap-3",
      )}
    >
      {players.map((player, index) => {
        const isCurrent = index === currentPlayerIndex;
        const position = runtime.playerPositions[index] ?? 0;
        const score = runtime.scores[index] ?? 0;
        const initial = player.name.trim().charAt(0).toUpperCase() || "?";

        return (
          <motion.div
            key={player.id}
            animate={isCurrent ? { scale: 1.02 } : { scale: 1 }}
            className={clsx(
              "relative flex shrink-0 items-center gap-2 rounded-xl border-4 px-3 py-2",
              isOverlay ? "min-w-[9.5rem] max-w-[12rem]" : "min-w-[10rem] flex-1 basis-[calc(50%-0.375rem)] gap-3 px-4 py-3 md:basis-0",
              isCurrent ?
                "border-kid-accent bg-kid-accent/25 pr-12 shadow-[0_0_0_2px_var(--kid-accent)]"
              : "border-kid-ink bg-kid-surface-muted/95",
            )}
          >
            <span
              className={clsx(
                "flex shrink-0 items-center justify-center rounded-full border-4 border-kid-ink font-bold text-white shadow-[2px_2px_0_0_var(--kid-shadow)]",
                isCurrent ? "h-9 w-9 text-sm" : "h-8 w-8 text-xs",
                !isOverlay && isCurrent && "h-12 w-12 text-lg",
                !isOverlay && !isCurrent && "h-10 w-10 text-base",
              )}
              style={{ backgroundColor: player.color }}
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span
                  className={clsx(
                    "truncate font-extrabold text-kid-ink",
                    isOverlay ? "text-sm" : "text-lg md:text-xl",
                  )}
                >
                  {player.name}
                </span>
                <motion.span
                  key={score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className={clsx("font-extrabold text-kid-ink", isOverlay ? "text-xs" : "text-base md:text-lg")}
                >
                  {score} {score === 1 ? "pt" : "pts"}
                </motion.span>
              </div>
              <p className={clsx("font-semibold text-kid-ink/60", isOverlay ? "text-[0.65rem]" : "text-xs")}>
                {position}/{boardLength}
                {isCurrent ? (
                  <span className="ml-1.5 font-bold uppercase tracking-wide text-kid-accent">· Turn</span>
                ) : null}
              </p>
            </div>
            {isCurrent ? (
              <DiceRollButton
                lastRoll={lastRoll}
                canRoll={canRoll}
                onRoll={onRoll}
                idleBounce={idleBounce}
                className={clsx("absolute right-1.5 top-1.5", isOverlay && "h-9 w-9 text-lg")}
              />
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );

  if (isOverlay) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 md:p-3">
        <div className="pointer-events-auto rounded-xl border-4 border-kid-ink/80 bg-kid-panel/90 p-2 shadow-[4px_4px_0_0_var(--kid-shadow)] backdrop-blur-sm md:p-3">
          {cards}
        </div>
      </div>
    );
  }

  return <KidPanel className="p-3 md:p-4">{cards}</KidPanel>;
}
