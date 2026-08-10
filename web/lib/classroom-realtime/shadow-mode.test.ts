import { afterEach, describe, expect, it } from "vitest";
import {
  classroomRealtimeAnnouncementPilotEnabled,
  classroomRealtimeLearnPensPilotEnabled,
  classroomRealtimeLearnNavigationPilotEnabled,
  classroomRealtimeParticipantRegistryPilotEnabled,
  classroomRealtimePresenceRosterPilotEnabled,
  classroomRealtimeRandomiserPilotEnabled,
  classroomRealtimeShadowModeEnabled,
  classroomRealtimeTimerPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";

const original = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
const originalAnnouncement = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;
const originalLearnPens = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT;
const originalLearnNavigation = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;
const originalPresenceRoster = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT;
const originalParticipantRegistry = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT;
const originalTimer = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT;
const originalRandomiser = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = original;
  if (originalAnnouncement === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT = originalAnnouncement;
  if (originalLearnPens === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT = originalLearnPens;
  if (originalLearnNavigation === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT = originalLearnNavigation;
  if (originalPresenceRoster === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT = originalPresenceRoster;
  if (originalParticipantRegistry === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT = originalParticipantRegistry;
  if (originalTimer === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT = originalTimer;
  if (originalRandomiser === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT = originalRandomiser;
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

  it("keeps the attendance roster cutover behind its own flag", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT;
    expect(classroomRealtimePresenceRosterPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT = "true";
    expect(classroomRealtimePresenceRosterPilotEnabled()).toBe(true);
  });

  it("keeps the durable participant registry behind its own flag", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT;
    expect(classroomRealtimeParticipantRegistryPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT = "true";
    expect(classroomRealtimeParticipantRegistryPilotEnabled()).toBe(true);
  });

  it("keeps the shared timer cutover independently reversible", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT;
    expect(classroomRealtimeTimerPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT = "true";
    expect(classroomRealtimeTimerPilotEnabled()).toBe(true);
  });

  it("keeps the shared randomiser cutover independently reversible", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT;
    expect(classroomRealtimeRandomiserPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT = "true";
    expect(classroomRealtimeRandomiserPilotEnabled()).toBe(true);
  });
});
