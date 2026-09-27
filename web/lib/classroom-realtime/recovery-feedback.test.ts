import { describe, expect, it } from "vitest";
import {
  classroomRecoveryFeedback,
  type ClassroomRecoveryState,
} from "@/lib/classroom-realtime/recovery-feedback";

describe("classroom reconnect feedback", () => {
  it.each<[ClassroomRecoveryState, string, "status" | "alert"]>([
    ["reconnecting", "Reconnecting to classroom…", "status"],
    ["recovered", "Classroom restored", "status"],
    ["failed", "Could not restore the classroom", "alert"],
  ])("describes %s in text with the correct live-region role", (state, title, role) => {
    expect(classroomRecoveryFeedback(state)).toMatchObject({ title, role });
  });

  it("does not render reconnect feedback during ordinary connected use", () => {
    expect(classroomRecoveryFeedback("idle")).toBeNull();
  });
});
