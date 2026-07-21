export type {
  AssignableActivityAdapter,
  AssignableActivityCard,
  AssignableActivityKind,
} from "@/lib/assignable-activities/types";
export {
  ASSIGNABLE_ACTIVITY_KINDS,
  isAssignableActivityKind,
} from "@/lib/assignable-activities/types";
export {
  assignableKindForHomeworkPayloadType,
  homeworkPayloadTypeForAssignableKind,
  sourceLabelForAssignableKind,
  sourceLabelForHomeworkPayloadType,
} from "@/lib/assignable-activities/map";
export {
  getAssignableActivityAdapter,
  listAssignableActivitiesForClass,
  listAssignableActivityKinds,
  tryGetAssignableActivityAdapter,
} from "@/lib/assignable-activities/registry";
