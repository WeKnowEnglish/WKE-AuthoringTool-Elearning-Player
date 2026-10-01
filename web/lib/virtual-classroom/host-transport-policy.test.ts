import { describe, expect, it } from "vitest";

import { resolveVirtualClassroomHostTransport } from "./host-transport-policy";

describe("Virtual Classroom host transport policy", () => {
  it("lets a fully authorized class-linked native shell start without Liveblocks", () => {
    expect(
      resolveVirtualClassroomHostTransport({
        classId: "class-1",
        nativeShellPilotEnabled: true,
        nativeShellAuthorityReady: true,
      }),
    ).toEqual({
      nativeSupabaseShellRequested: true,
      requiresLiveblocksPreflight: false,
    });
  });

  it.each([
    { classId: null, nativeShellPilotEnabled: true, nativeShellAuthorityReady: true },
    { classId: "class-1", nativeShellPilotEnabled: false, nativeShellAuthorityReady: true },
    { classId: "class-1", nativeShellPilotEnabled: true, nativeShellAuthorityReady: false },
  ])("keeps Liveblocks required for guest or compatibility classrooms", (input) => {
    expect(resolveVirtualClassroomHostTransport(input)).toEqual({
      nativeSupabaseShellRequested: false,
      requiresLiveblocksPreflight: true,
    });
  });
});
