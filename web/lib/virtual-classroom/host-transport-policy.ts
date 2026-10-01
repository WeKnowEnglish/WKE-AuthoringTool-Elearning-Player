export type VirtualClassroomHostTransportPolicy = {
  nativeSupabaseShellRequested: boolean;
  requiresLiveblocksPreflight: boolean;
};

/**
 * Keep one-off and compatibility classrooms fail-fast on Liveblocks, while a
 * fully authorized class-linked native shell can start without provisioning
 * an outer Liveblocks room.
 */
export function resolveVirtualClassroomHostTransport(input: {
  classId: string | null;
  nativeShellPilotEnabled: boolean;
  nativeShellAuthorityReady: boolean;
}): VirtualClassroomHostTransportPolicy {
  const nativeSupabaseShellRequested =
    Boolean(input.classId) &&
    input.nativeShellPilotEnabled &&
    input.nativeShellAuthorityReady;

  return {
    nativeSupabaseShellRequested,
    requiresLiveblocksPreflight: !nativeSupabaseShellRequested,
  };
}
