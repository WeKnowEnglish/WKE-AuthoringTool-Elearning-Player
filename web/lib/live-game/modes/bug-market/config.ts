import type { LiveGameModeConfig } from "@/lib/live-game/modes/types";

/** Bug Market is registered for architecture work but is not launchable yet. */
export const BUG_MARKET_MODE = {
  id: "bug_market",
  title: "Bug Market",
  subtitle: "Catch bugs, answer questions, and build your market stall.",
  defaultDurationMinutes: 10,
  defaultMapId: "bug-market-v1",
} as const satisfies LiveGameModeConfig;
