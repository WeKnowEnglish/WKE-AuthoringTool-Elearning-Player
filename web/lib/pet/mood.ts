import type { PetMeterId, PetSnapshotV1 } from "@/lib/pet/types";

const METER_LABELS: Record<PetMeterId, string> = {
  hunger: "hungry",
  thirst: "thirsty",
  energy: "tired",
  cleanliness: "messy",
  happiness: "sad",
};

export function petMoodLine(snapshot: PetSnapshotV1): string | null {
  let lowestId: PetMeterId | null = null;
  let lowest = 101;
  for (const id of Object.keys(snapshot.meters) as PetMeterId[]) {
    const v = snapshot.meters[id];
    if (v < lowest) {
      lowest = v;
      lowestId = id;
    }
  }
  if (lowestId === null || lowest > 35) return null;
  return `Your pet feels ${METER_LABELS[lowestId]}!`;
}
