import { afterEach, describe, expect, it } from "vitest";
import {
  classroomRealtimeAnnouncementPilotEnabled,
  classroomRealtimeShadowModeEnabled,
} from "@/lib/classroom-realtime/shadow-mode";

const original = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
const originalAnnouncement = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = original;
  if (originalAnnouncement === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT = originalAnnouncement;
});
describe("classroom realtime shadow-mode flag", () => {
  it("is disabled unless explicitly enabled", () => {
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
    expect(classroomRealtimeShadowModeEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    expect(classroomRealtimeShadowModeEnabled()).toBe(true);
  });

  it("requires shadow mode before enabling the visible announcement pilot", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
    expect(classroomRealtimeAnnouncementPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    expect(classroomRealtimeAnnouncementPilotEnabled()).toBe(true);
  });
});
