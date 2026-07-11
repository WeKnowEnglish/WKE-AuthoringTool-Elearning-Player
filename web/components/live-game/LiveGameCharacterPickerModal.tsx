"use client";

import { motion, AnimatePresence } from "motion/react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { LiveGameCharacterPicker } from "@/components/live-game/LiveGameCharacterPicker";
import type { LiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";

type Props = {
  open: boolean;
  value: LiveGameCharacterId;
  onChange: (avatarId: LiveGameCharacterId) => void;
  onClose: () => void;
  takenAvatarIds?: ReadonlySet<LiveGameCharacterId>;
};

export function LiveGameCharacterPickerModal({
  open,
  value,
  onChange,
  onClose,
  takenAvatarIds,
}: Props) {
  return (
    <AnimatePresence>
      {open ?
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-4 border-kid-ink bg-white p-5 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-game-character-picker-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="live-game-character-picker-title" className="text-xl font-extrabold text-kid-ink">
                Choose your character
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Close
              </button>
            </div>

            <LiveGameCharacterPicker value={value} onChange={onChange} takenAvatarIds={takenAvatarIds} />

            <div className="mt-5 flex justify-end">
              <KidButton variant="primary" onClick={onClose}>
                Done
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
