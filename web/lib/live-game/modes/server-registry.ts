import type { LiveGameModeId } from "@/lib/live-game/modes/types";
import { isLiveGameModeId } from "@/lib/live-game/modes/registry";
import { resetEnglishCraftGameplayState } from "@/lib/live-game/liveblocks/gameplay-reset";
import type { LiveGameMutatorRoot } from "@/lib/live-game/server/mutator";
import { createBugMarketInitialModeStorage } from "@/lib/live-game/modes/bug-market/state";

type LiveGameServerModule = {
  resetRound: (storage: LiveGameMutatorRoot) => void;
};

const LIVE_GAME_SERVER_MODULES: Partial<Record<LiveGameModeId, LiveGameServerModule>> = {
  english_craft: {
    resetRound: resetEnglishCraftGameplayState,
  },
  bug_market: {
    resetRound(storage) {
      const fields = createBugMarketInitialModeStorage(`bug-market-round-${Date.now()}`);
      for (const [key, value] of Object.entries(fields)) {
        storage.set(key, value);
      }
    },
  },
};

export function resetLiveGameModeRound(
  modeId: unknown,
  storage: LiveGameMutatorRoot,
): void {
  if (typeof modeId !== "string" || !isLiveGameModeId(modeId)) {
    throw new Error(`Unknown live game mode: ${String(modeId)}`);
  }
  const gameModule = LIVE_GAME_SERVER_MODULES[modeId];
  if (!gameModule) {
    throw new Error(`Live game mode is not ready to reset rounds: ${modeId}`);
  }
  gameModule.resetRound(storage);
}
