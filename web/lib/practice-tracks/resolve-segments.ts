import type {
  LearningTrackBeatPlan,
  LearningTrackLessonPlayerPack,
} from "@/lib/learning-tracks/parse-track-pack";
import type { GradedActivityPolicy } from "@/lib/graded-activities";
import { getCoreModuleGradingPolicy, isCoreModuleId } from "@/lib/activity-builder/core-modules";

export type PracticeTrackSegment = {
  id: string;
  kind: string;
  label: string;
  order: number;
  screenStart: number;
  screenEnd: number;
  screenCount: number;
  estimatedMinutes: number;
  gradingPolicy: GradedActivityPolicy;
  bridgeScreenIndex?: number;
};

export type ResolvedPracticeTrack = {
  pack: LearningTrackLessonPlayerPack;
  segments: PracticeTrackSegment[];
};

function gradingPolicyForBeatKind(kind: string): GradedActivityPolicy {
  if (isCoreModuleId(kind)) {
    return getCoreModuleGradingPolicy(kind);
  }
  if (kind === "listening_item_match") return "automatic";
  if (kind === "explore_hotspots" || kind === "language_in_focus") {
    return "completion";
  }
  if (kind === "presentation") return "ungraded";
  return "ungraded";
}

export function resolvePracticeTrackSegments(
  pack: LearningTrackLessonPlayerPack,
): PracticeTrackSegment[] {
  return pack.beat_plan.map((beat, index) => ({
    id: beat.id,
    kind: beat.kind,
    label: beat.label,
    order: index,
    screenStart: beat.screenStart ?? 0,
    screenEnd: beat.screenEnd ?? beat.screenStart ?? 0,
    screenCount: beat.screenCount,
    estimatedMinutes: beat.estimatedMinutes,
    gradingPolicy: gradingPolicyForBeatKind(beat.kind),
    bridgeScreenIndex: beat.afterBridge?.screenIndex,
  }));
}

export function resolvePracticeTrack(
  pack: LearningTrackLessonPlayerPack,
): ResolvedPracticeTrack {
  return {
    pack,
    segments: resolvePracticeTrackSegments(pack),
  };
}

export function practiceSegmentIndexForScreen(
  segments: readonly PracticeTrackSegment[],
  screenIndex: number,
): number {
  const direct = segments.findIndex(
    (segment) =>
      screenIndex >= segment.screenStart && screenIndex < segment.screenEnd,
  );
  if (direct >= 0) return direct;

  const bridge = segments.findIndex(
    (segment) => segment.bridgeScreenIndex === screenIndex,
  );
  if (bridge >= 0) return bridge;

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]!;
    if (screenIndex >= segment.screenStart) return index;
  }
  return 0;
}

export function beatPlanEntryForScreen(
  beatPlan: readonly LearningTrackBeatPlan[],
  screenIndex: number,
): LearningTrackBeatPlan | null {
  return beatPlan.find(
    (beat) =>
      beat.screenStart !== undefined &&
      beat.screenEnd !== undefined &&
      screenIndex >= beat.screenStart &&
      screenIndex < beat.screenEnd,
  ) ??
    beatPlan.find((beat) => beat.afterBridge?.screenIndex === screenIndex) ??
    beatPlan[beatPlan.length - 1] ??
    null;
}
