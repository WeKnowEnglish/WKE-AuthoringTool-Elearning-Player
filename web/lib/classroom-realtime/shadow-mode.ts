/**
 * Enables a non-authoritative Supabase Realtime connection for class-linked
 * Virtual Classrooms. Keep disabled until Realtime private access is enabled
 * and the pilot environment has been verified.
 */
export function classroomRealtimeShadowModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE === "true";
}
