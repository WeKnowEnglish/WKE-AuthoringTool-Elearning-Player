/**
 * Enables a non-authoritative Supabase Realtime connection for class-linked
 * Virtual Classrooms. Keep disabled until Realtime private access is enabled
 * and the pilot environment has been verified.
 */
export function classroomRealtimeShadowModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE === "true";
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
