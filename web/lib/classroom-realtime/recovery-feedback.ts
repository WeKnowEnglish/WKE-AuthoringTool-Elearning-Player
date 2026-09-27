export type ClassroomRecoveryState =
  | "idle"
  | "reconnecting"
  | "recovered"
  | "failed";

export type ClassroomRecoveryFeedback = {
  role: "status" | "alert";
  title: string;
  detail: string;
};

/**
 * User-facing reconnect copy shared by teacher and student surfaces.
 * It deliberately describes lesson continuity without exposing classroom content.
 */
export function classroomRecoveryFeedback(
  state: ClassroomRecoveryState,
): ClassroomRecoveryFeedback | null {
  switch (state) {
    case "reconnecting":
      return {
        role: "status",
        title: "Reconnecting to classroom…",
        detail: "Your place in the lesson is saved.",
      };
    case "recovered":
      return {
        role: "status",
        title: "Classroom restored",
        detail: "You are back at the latest saved lesson state.",
      };
    case "failed":
      return {
        role: "alert",
        title: "Could not restore the classroom",
        detail: "Check your connection, then refresh the page to try again.",
      };
    default:
      return null;
  }
}
