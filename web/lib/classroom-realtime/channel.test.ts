import { describe, expect, it } from "vitest";
import {
  classroomRealtimeChannelConfig,
  classroomRealtimeTopic,
} from "@/lib/classroom-realtime/channel";

describe("classroom realtime channel contract", () => {
  it("uses a stable session-scoped topic", () => {
    expect(classroomRealtimeTopic("vcs_ABC123")).toBe("classroom:vcs_ABC123");
  });

  it("rejects arbitrary channel names", () => {
    expect(() => classroomRealtimeTopic("other-room")).toThrow("Invalid Virtual Classroom session id.");
  });

  it("uses a private channel and a stable presence key", () => {
    expect(classroomRealtimeChannelConfig("student-1")).toEqual({
      config: {
        private: true,
        broadcast: { self: true, ack: true },
        presence: { key: "student-1" },
      },
    });
  });
});
