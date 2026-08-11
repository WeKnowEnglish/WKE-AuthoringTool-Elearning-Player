import type {
  ClassroomRuntimePatch,
  ClassroomRuntimeSnapshot,
} from "@/lib/classroom-realtime/types";
import { createEmptyRandomiser, normalizeRandomiserState } from "@/lib/classroom-tools/dice";
import { createEmptyPickerState, normalizeStudentPickerState } from "@/lib/classroom-tools/picker";
import { createEmptyGroupSet, normalizeGroupSetState } from "@/lib/virtual-classroom/tools/groups";
import { createEmptySessionPoints, normalizeSessionPointsState } from "@/lib/virtual-classroom/tools/points";
import { createEmptyClassroomStatus, normalizeClassroomStatusState } from "@/lib/virtual-classroom/tools/status";
import { createIdleGlobalTimer, normalizeGlobalTimerState } from "@/lib/classroom-tools/timer";

/** Complete provider-neutral state consumed by the future native shell. */
export function resolveClassroomRuntimeViewState(input: {
  snapshot: ClassroomRuntimeSnapshot;
  patch?: ClassroomRuntimePatch | null;
}) {
  const { snapshot, patch } = input;
  const tools = { ...snapshot.tools, ...(patch?.tools ?? {}) };
  return {
    status: patch?.status ?? snapshot.status,
    uiMode: patch?.uiMode ?? snapshot.uiMode,
    learnStage: patch?.learnStage ?? snapshot.learnStage,
    learnActivity:
      patch && Object.hasOwn(patch, "learnActivity")
        ? patch.learnActivity ?? null
        : snapshot.learnActivity,
    learnPresentation:
      patch && Object.hasOwn(patch, "learnPresentation")
        ? patch.learnPresentation ?? null
        : snapshot.learnPresentation,
    learnStudentPensEnabled:
      patch?.learnStudentPensEnabled ?? snapshot.learnStudentPensEnabled,
    announcement:
      patch && Object.hasOwn(patch, "announcement")
        ? patch.announcement ?? null
        : snapshot.announcement,
    activeActivity:
      patch && Object.hasOwn(patch, "activeActivity")
        ? patch.activeActivity ?? snapshot.activeActivity
        : snapshot.activeActivity,
    timer: normalizeGlobalTimerState(tools.timer) ?? createIdleGlobalTimer(),
    randomiser: normalizeRandomiserState(tools.randomiser) ?? createEmptyRandomiser(),
    points: normalizeSessionPointsState(tools.points) ?? createEmptySessionPoints(),
    picker: normalizeStudentPickerState(tools.picker) ?? createEmptyPickerState([]),
    groupSet: normalizeGroupSetState(tools.groupSet) ?? createEmptyGroupSet(),
    classroomStatus:
      normalizeClassroomStatusState(tools.classroomStatus) ?? createEmptyClassroomStatus(),
  };
}
