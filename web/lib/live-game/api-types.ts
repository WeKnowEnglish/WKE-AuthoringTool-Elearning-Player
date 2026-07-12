import type { LiveGameResourcePool, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";

export type LiveGamePoolTotal = LiveGameResourcePool;

export type LiveGameHarvestAnswerResponse = {
  correct: boolean;
  carryGranted: { type: LiveGameResourceType; sourceNodeId: string } | null;
  resourceAwarded: null;
  poolTotal: LiveGamePoolTotal;
  nodeCooldownEndsAt?: number;
  alreadyAwarded?: boolean;
};

export type LiveGameDepositAnswerResponse = {
  correct: boolean;
  resourceDeposited: { type: LiveGameResourceType; amount: number } | null;
  poolTotal: LiveGamePoolTotal;
  carryCleared?: boolean;
  carryRetained?: boolean;
  alreadyAwarded?: boolean;
};
