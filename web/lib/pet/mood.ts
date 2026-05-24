import { PET_METER_IDS } from "@/lib/pet/types";
import type { PetMeterId, PetMood, PetSnapshotV1 } from "@/lib/pet/types";

/** Lowest meter at or below this shows the mood line and sad pose. */
export const PET_MOOD_LINE_THRESHOLD = 35;

const METER_LABELS: Record<PetMeterId, string> = {
  hunger: "hungry",
  thirst: "thirsty",
  energy: "tired",
  cleanliness: "messy",
  happiness: "sad",
};

export function lowestPetMeterValue(snapshot: PetSnapshotV1): number {
  return Math.min(...PET_METER_IDS.map((id) => snapshot.meters[id]));
}

export function petBaselineMood(snapshot: PetSnapshotV1): PetMood {
  return lowestPetMeterValue(snapshot) <= PET_MOOD_LINE_THRESHOLD ? "sad" : "normal";
}

export function petMoodLine(snapshot: PetSnapshotV1): string | null {
  let lowestId: PetMeterId | null = null;
  let lowest = 101;
  for (const id of PET_METER_IDS) {
    const v = snapshot.meters[id];
    if (v < lowest) {
      lowest = v;
      lowestId = id;
    }
  }
  if (lowestId === null || lowest > PET_MOOD_LINE_THRESHOLD) return null;
  return `Your pet feels ${METER_LABELS[lowestId]}!`;
}
