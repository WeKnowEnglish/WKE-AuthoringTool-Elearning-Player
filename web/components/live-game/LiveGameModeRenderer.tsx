"use client";

import { LiveGameCanvas } from "@/components/live-game/LiveGameCanvas";
import { BugMarketFoundationGame } from "@/components/live-game/bug-market/BugMarketFoundationGame";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";

type Props = {
  modeId: LiveGameModeId;
  context: LiveGameSessionContext;
};

export function LiveGameModeRenderer({ modeId, context }: Props) {
  switch (modeId) {
    case "english_craft":
      return <LiveGameCanvas context={context} />;
    case "bug_market":
      return <BugMarketFoundationGame context={context} />;
  }
}
