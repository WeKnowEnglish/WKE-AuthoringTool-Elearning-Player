export {
  applyMeterDeltas,
  clampMeter,
  PET_CARE_METER_DELTAS,
  STUDY_COMPLETE_METER_DELTAS,
} from "@/lib/pet/care-actions";
export {
  DECAY_PER_HOUR,
  DEFAULT_METER_VALUE,
  DEFAULT_PET_METERS,
  emptyPetSnapshot,
  MAX_DECAY_PER_READ,
  PET_STORAGE_KEY,
} from "@/lib/pet/defaults";
export { applyDecay, decayAmountForElapsedMs } from "@/lib/pet/decay";
export { petMoodLine } from "@/lib/pet/mood";
export {
  applyPetCare,
  completeStudyCareIfPending,
  getPetSnapshot,
  isStudyCarePending,
  setPetSnapshot,
  setStudyCarePending,
} from "@/lib/pet/storage";
export type { PetCareActionId, PetMeterId, PetSnapshotV1 } from "@/lib/pet/types";
export { PET_CARE_ACTION_IDS, PET_METER_IDS } from "@/lib/pet/types";
