import "server-only";
import { cookies } from "next/headers";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import { VC_HOST_COOKIE, VC_MEMBER_COOKIE } from "@/lib/virtual-classroom/session-cookie";
import { authorizeVirtualClassroomRuntimeReader } from "./runtime-access";

/** Recorded activity bindings plus current classroom access establish identity. */
export async function authorizeClassroomActivity(input: {
  session: VirtualClassroomSessionRecord;
  round: { sessionId: string; createdBy: string; phase: string };
  allowCompleted?: boolean;
}) {
  if (!input.session.createdBy || !input.round.createdBy || input.round.sessionId !== input.session.id || input.round.createdBy !== input.session.createdBy) return null;
  if (input.round.phase === "completed" && !input.allowCompleted) return null;
  const store = await cookies();
  const reader = await authorizeVirtualClassroomRuntimeReader({ session: input.session,
    hostCookie: store.get(VC_HOST_COOKIE)?.value, memberCookie: store.get(VC_MEMBER_COOKIE)?.value });
  if (!reader?.userId || (reader.role === "host" && reader.userId !== input.round.createdBy)) return null;
  if (input.round.phase === "completed" && reader.role !== "host") return null;
  return { ...reader, userId: reader.userId, displayName: reader.displayName ?? "Participant" };
}
