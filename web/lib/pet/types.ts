export const PET_METER_IDS = [
  "hunger",
  "thirst",
  "energy",
  "cleanliness",
  "happiness",
] as const;

export type PetMeterId = (typeof PET_METER_IDS)[number];

export const PET_CARE_ACTION_IDS = [
  "feed",
  "drink",
  "play",
  "wash",
  "sleep",
  "study",
] as const;

export type PetCareActionId = (typeof PET_CARE_ACTION_IDS)[number];

export type PetSnapshotV1 = {
  schemaVersion: 1;
  meters: Record<PetMeterId, number>;
  lastUpdatedAt: number;
  studyCarePending: boolean;
  /** Last successful pet treasure claim (ms epoch). */
  lastPetGoldClaimAt?: number;
};
