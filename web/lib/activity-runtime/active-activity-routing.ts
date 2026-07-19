import type { VirtualClassroomActivityKind } from "@/lib/activity-runtime/activity-types";

/**
 * Virtual Classroom `activeActivity` — session points at the current activity
 * without ending the classroom session.
 */
export type ActiveActivityRef = {
  kind: VirtualClassroomActivityKind | null;
  /** Join code or round id students use to enter the activity. */
  joinCode: string | null;
  label: string | null;
  /** Optional durable round id (document / whiteboard). */
  roundId?: string | null;
  /** Optional Liveblocks room id for the activity round. */
  roomId?: string | null;
};

export function emptyActiveActivity(): ActiveActivityRef {
  return {
    kind: null,
    joinCode: null,
    label: null,
    roundId: null,
    roomId: null,
  };
}

export function isActivityLive(activity: ActiveActivityRef | null | undefined): boolean {
  return Boolean(activity?.kind && activity.joinCode);
}

/** Student entry path hints (UI routing). */
export function studentEntryPathForActivity(activity: ActiveActivityRef): string | null {
  if (!activity.kind || !activity.joinCode) return null;
  if (activity.kind === "whiteboard") {
    return `/whiteboard/${activity.joinCode}`;
  }
  if (activity.kind === "document") {
    return `/document/${activity.roundId ?? activity.joinCode}`;
  }
  return null;
}
