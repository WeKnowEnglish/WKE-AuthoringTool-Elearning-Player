import "server-only";

import { dailyRequest, type DailyFetch } from "@/lib/daily/client";
import { logDaily } from "@/lib/daily/log";
import type {
  DailyCallRole,
  DailyMeetingTokenInput,
  DailyMeetingTokenResult,
} from "@/lib/daily/types";
import { DailyApiError } from "@/lib/daily/types";

function tokenPropertiesForRole(input: DailyMeetingTokenInput) {
  const base = {
    room_name: input.roomName,
    user_id: input.userId,
    user_name: input.userName.slice(0, 64),
    exp: input.exp,
    enable_recording: false,
    start_cloud_recording: false,
  };

  if (input.role === "teacher") {
    return {
      ...base,
      is_owner: true,
      enable_screenshare: true,
    };
  }

  return {
    ...base,
    is_owner: false,
    enable_screenshare: false,
  };
}

export function buildMeetingTokenProperties(input: DailyMeetingTokenInput) {
  return tokenPropertiesForRole(input);
}

export async function createDailyMeetingToken(
  input: DailyMeetingTokenInput & { roomUrl: string; fetchImpl?: DailyFetch },
): Promise<DailyMeetingTokenResult> {
  const properties = buildMeetingTokenProperties(input);
  const response = await dailyRequest<{ token?: string }>("/meeting-tokens", {
    method: "POST",
    fetchImpl: input.fetchImpl,
    body: { properties },
  });

  if (!response.token) {
    throw new DailyApiError("Daily meeting token response missing token.", 502);
  }

  logDaily("token_issued", {
    roomName: input.roomName,
    role: input.role,
    userId: input.userId,
    exp: input.exp,
  });

  return {
    token: response.token,
    roomName: input.roomName,
    roomUrl: input.roomUrl,
    exp: input.exp,
    role: input.role,
  };
}

export function callRoleFromVcRole(
  vcRole: "host" | "member",
  isTeacherUser: boolean,
): DailyCallRole {
  if (vcRole === "host") return "teacher";
  if (isTeacherUser) return "teacher";
  return "student";
}
