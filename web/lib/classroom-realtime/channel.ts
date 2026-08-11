/** Private Supabase Realtime topic for the class-linked classroom control plane. */
export function classroomRealtimeTopic(sessionId: string): string {
  const id = sessionId.trim();
  if (!/^vcs_[A-Z0-9]{6}$/i.test(id)) {
    throw new Error("Invalid Virtual Classroom session id.");
  }
  return `classroom:${id}`;
}
/**
 * Transport configuration shared by the future Supabase adapter.  This is not
 * wired into the live UI yet; it simply prevents per-component channel drift.
 */
export function classroomRealtimeChannelConfig(userId: string) {
  const presenceKey = userId.trim();
  if (!presenceKey) throw new Error("A participant id is required for classroom presence.");
  return {
    config: {
      private: true,
      broadcast: { self: true, ack: true },
      presence: { key: presenceKey },
    },
  } as const;
}
