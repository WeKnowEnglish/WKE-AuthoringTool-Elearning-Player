"use client";

import { motion, AnimatePresence } from "motion/react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { boardLengthForSetup } from "@/lib/board-game/map/resolve-map";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

type Props = {
  open: boolean;
  setup: GameSetup;
  runtime: GameRuntime;
  onPlayAgain: () => void;
  onBackToSetup: () => void;
};

export function WinCelebrationModal({
  open,
  setup,
  runtime,
  onPlayAgain,
  onBackToSetup,
}: Props) {
  const winner = runtime.winnerIndex !== null ? setup.players[runtime.winnerIndex] : null;
  const boardLength = boardLengthForSetup(setup);

  if (!open || !winner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/75 p-4"
      >
        <motion.div
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-2xl rounded-2xl border-4 border-kid-ink bg-kid-panel p-8 text-center shadow-[8px_8px_0_0_var(--kid-shadow)]"
        >
          <motion.p
            animate={{ rotate: 8 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.6, ease: "easeInOut" }}
            className="text-7xl"
          >
            🏆
          </motion.p>
          <h2 className="mt-4 text-4xl font-extrabold text-kid-ink">{winner.name} Wins!</h2>
          <p className="mt-2 text-xl text-kid-ink/70">Great job reaching the finish!</p>

          <div className="mt-8 space-y-3 text-left">
            {setup.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-xl border-4 border-kid-ink bg-kid-surface-muted px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-6 w-6 rounded-full border-2 border-kid-ink"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="text-lg font-bold">{player.name}</span>
                </div>
                <span className="font-bold">
                  {runtime.scores[index] ?? 0} pts · {runtime.playerPositions[index] ?? 0}/{boardLength}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <KidButton onClick={onPlayAgain}>Play Again</KidButton>
            <KidButton variant="secondary" onClick={onBackToSetup}>
              Return to Setup
            </KidButton>
          </div>

          <ConfettiBurst />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => (
        <motion.span
          key={i}
          initial={{ y: -20, x: `${(i * 17) % 100}%`, opacity: 1 }}
          animate={{ y: 400, opacity: 0, rotate: 360 }}
          transition={{ duration: 2 + (i % 3) * 0.3, delay: i * 0.04 }}
          className="absolute text-2xl"
        >
          {["🎉", "⭐", "✨", "🎊"][i % 4]}
        </motion.span>
      ))}
    </div>
  );
}

export function FloatingPointGain({ show, label }: { show: boolean; label?: string | null }) {
  const copy = label ?? "+1 Point!";

  return (
    <AnimatePresence>
      {show ? (
        <motion.p
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -30, scale: 1.1 }}
          exit={{ opacity: 0, y: -60 }}
          className="pointer-events-none fixed bottom-32 left-1/2 z-[75] -translate-x-1/2 text-3xl font-extrabold text-green-500 drop-shadow-lg"
        >
          {copy}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
