/** Whiteboard phase machine — shared collaborative-activity contract. */
export {
  assertTransition,
  canTransition,
  isCollectingOrLater,
  isEditingPhase,
} from "@/lib/collaborative-activity/state-machine";
