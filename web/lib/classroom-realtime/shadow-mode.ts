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
