import { grantGardenSeed } from "@/lib/garden/actions";
import type { GardenSeedTier, GardenSnapshotV1 } from "@/lib/garden/types";

/** Awards a garden seed for a quiz/lesson event. Idempotent per `eventId`. */
export function grantGardenSeedForQuiz(
  eventId: string,
  opts?: { tier?: GardenSeedTier },
): GardenSnapshotV1 {
  return grantGardenSeed({
    eventId: `garden:${eventId}`,
    tier: opts?.tier,
  });
}
