import type { PetMeterId, PetSnapshotV1 } from "@/lib/pet/types";

export const PET_STORAGE_KEY = "wke-pet-v1";

export const DEFAULT_METER_VALUE = 85;

export const DEFAULT_PET_METERS: Record<PetMeterId, number> = {
  hunger: DEFAULT_METER_VALUE,
  thirst: DEFAULT_METER_VALUE,
  energy: DEFAULT_METER_VALUE,
  cleanliness: DEFAULT_METER_VALUE,
  happiness: DEFAULT_METER_VALUE,
};

/** Points lost per meter per elapsed hour (capped per read). */
export const DECAY_PER_HOUR = 3;
export const MAX_DECAY_PER_READ = 15;

export function emptyPetSnapshot(now = Date.now()): PetSnapshotV1 {
  return {
    schemaVersion: 1,
    meters: { ...DEFAULT_PET_METERS },
    lastUpdatedAt: now,
    studyCarePending: false,
  };
}
