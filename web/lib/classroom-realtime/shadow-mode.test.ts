import { afterEach, describe, expect, it } from "vitest";
import {
  classroomRealtimeAuthorityPilotEnabled,
  classroomRealtimeAnnouncementPilotEnabled,
  classroomRealtimeLearnPensPilotEnabled,
  classroomRealtimeLearnNavigationPilotEnabled,
  classroomRealtimeLifecycleAuthorityPilotEnabled,
  classroomRealtimeLifecyclePilotEnabled,
  classroomRealtimeParticipantRegistryPilotEnabled,
  classroomRealtimePointsPilotEnabled,
  classroomRealtimePickerGroupsPilotEnabled,
  classroomRealtimePresenceRosterPilotEnabled,
  classroomRealtimeRandomiserPilotEnabled,
  classroomRealtimeShadowModeEnabled,
  classroomRealtimeStatusPilotEnabled,
  classroomRealtimeTimerPilotEnabled,
  classroomRealtimeToolAuthorityPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";

const original = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
const originalAuthority = process.env.CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT;
const originalToolAuthority = process.env.CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT;
const originalLifecycleAuthority = process.env.CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT;
const originalAnnouncement = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT;
const originalLearnPens = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT;
const originalLearnNavigation = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;
const originalPresenceRoster = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT;
const originalParticipantRegistry = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT;
const originalTimer = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT;
const originalRandomiser = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT;
const originalPoints = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT;
const originalPickerGroups = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT;
const originalStatus = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT;
const originalLifecycle = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = original;
  if (originalAuthority === undefined) delete process.env.CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT;
  else process.env.CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT = originalAuthority;
  if (originalToolAuthority === undefined) delete process.env.CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT;
  else process.env.CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT = originalToolAuthority;
  if (originalLifecycleAuthority === undefined) delete process.env.CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT;
  else process.env.CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT = originalLifecycleAuthority;
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
  if (originalPoints === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT = originalPoints;
  if (originalPickerGroups === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT = originalPickerGroups;
  if (originalStatus === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT = originalStatus;
  if (originalLifecycle === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT = originalLifecycle;
});
describe("classroom realtime shadow-mode flag", () => {
  it("is disabled unless explicitly enabled", () => {
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
    expect(classroomRealtimeShadowModeEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    expect(classroomRealtimeShadowModeEnabled()).toBe(true);
  });

  it("keeps Supabase command authority server-side and dependent on shadow mode", () => {
    process.env.CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
    expect(classroomRealtimeAuthorityPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    expect(classroomRealtimeAuthorityPilotEnabled()).toBe(true);
  });

  it("does not enable authority until every matching Supabase read pilot is active", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    process.env.CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT;
    expect(classroomRealtimeAuthorityPilotEnabled()).toBe(false);
  });

  it("requires every tool read pilot before enabling tool authority", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    process.env.CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT = "true";
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT;
    expect(classroomRealtimeToolAuthorityPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT = "true";
    expect(classroomRealtimeToolAuthorityPilotEnabled()).toBe(true);
  });

  it("keeps lifecycle authority behind its matching read pilot", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    process.env.CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT;
    expect(classroomRealtimeLifecycleAuthorityPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT = "true";
    expect(classroomRealtimeLifecycleAuthorityPilotEnabled()).toBe(true);
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

  it("keeps session points behind an independent rollback flag", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT;
    expect(classroomRealtimePointsPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT = "true";
    expect(classroomRealtimePointsPilotEnabled()).toBe(true);
  });

  it("moves picker and groups only through their shared rollback flag", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT;
    expect(classroomRealtimePickerGroupsPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT = "true";
    expect(classroomRealtimePickerGroupsPilotEnabled()).toBe(true);
  });

  it("keeps classroom-management status behind its own rollback flag", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT;
    expect(classroomRealtimeStatusPilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT = "true";
    expect(classroomRealtimeStatusPilotEnabled()).toBe(true);
  });

  it("keeps session lifecycle behind its own rollback flag", () => {
    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT;
    expect(classroomRealtimeLifecyclePilotEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT = "true";
    expect(classroomRealtimeLifecyclePilotEnabled()).toBe(true);
  });
});
