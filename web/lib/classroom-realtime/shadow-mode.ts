/**
 * Enables a non-authoritative Supabase Realtime connection for class-linked
 * Virtual Classrooms. Keep disabled until Realtime private access is enabled
 * and the pilot environment has been verified.
 */
export function classroomRealtimeShadowModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE === "true";
}

/**
 * Server-side authority pilot for shared controls that already have Supabase
 * read pilots. Liveblocks remains a compatibility mirror during this phase.
 */
export function classroomRealtimeAuthorityPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT === "true"
  );
}

/** Supabase authority for ordinary classroom tools, independently reversible. */
export function classroomRealtimeToolAuthorityPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT === "true"
  );
}

/** Supabase authority for activity launch references and terminal class state. */
export function classroomRealtimeLifecycleAuthorityPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT === "true" &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT === "true"
  );
}

/**
 * First visible Supabase cutover. This deliberately remains narrower than the
 * shadow connection and is safe to disable independently.
 */
export function classroomRealtimeAnnouncementPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT === "true"
  );
}

/** Second visible cutover: the teacher's shared student-pen permission. */
export function classroomRealtimeLearnPensPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT === "true"
  );
}

/**
 * Shared Learn navigation must move together: mode, stage, and the selected
 * lesson activity are one classroom decision, not three independent toggles.
 */
export function classroomRealtimeLearnNavigationPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT === "true"
  );
}

/** First visible participant-roster cutover: the Attendance panel only. */
export function classroomRealtimePresenceRosterPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT === "true"
  );
}

/** Server-side teacher-tool roster pilot, backed by durable attendance. */
export function classroomRealtimeParticipantRegistryPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT === "true"
  );
}

/** Shared countdown/stopwatch display sourced from snapshot + Broadcast. */
export function classroomRealtimeTimerPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT === "true"
  );
}

/** Shared dice/randomiser state sourced from snapshot + Broadcast. */
export function classroomRealtimeRandomiserPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT === "true"
  );
}

/** Session points and leaderboard sourced from snapshot + Broadcast. */
export function classroomRealtimePointsPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT === "true"
  );
}

/** Picker and group-maker state sourced together from snapshot + Broadcast. */
export function classroomRealtimePickerGroupsPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT === "true"
  );
}

/** Student help/hand/status signals and teacher freeze state. */
export function classroomRealtimeStatusPilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT === "true"
  );
}

/** Session lifecycle and the currently launched shared activity. */
export function classroomRealtimeLifecyclePilotEnabled(): boolean {
  return (
    classroomRealtimeShadowModeEnabled() &&
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT === "true"
  );
}
