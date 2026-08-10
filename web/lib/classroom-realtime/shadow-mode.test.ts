import { afterEach, describe, expect, it } from "vitest";
import {
  classroomRealtimeAnnouncementPilotEnabled,
  classroomRealtimeLearnPensPilotEnabled,
  classroomRealtimeLearnNavigationPilotEnabled,
  classroomRealtimeShadowModeEnabled,
} from "@/lib/classroom-realtime/shadow-mode";

const original = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
const originalAnnouncement = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;
const originalLearnPens = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT;
const originalLearnNavigation = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = original;
  if (originalAnnouncement === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT = originalAnnouncement;
  if (originalLearnPens === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT = originalLearnPens;
  if (originalLearnNavigation === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT = originalLearnNavigation;
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

  it("keeps the student-pen cutover independently reversible", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT;
    expect(classroomRealtimeLearnPensPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT = "true";
    expect(classroomRealtimeLearnPensPilotEnabled()).toBe(true);
  });

  it("moves the shared Learn navigation only as an explicit unit", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;
    expect(classroomRealtimeLearnNavigationPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT = "true";
    expect(classroomRealtimeLearnNavigationPilotEnabled()).toBe(true);
  });
});
