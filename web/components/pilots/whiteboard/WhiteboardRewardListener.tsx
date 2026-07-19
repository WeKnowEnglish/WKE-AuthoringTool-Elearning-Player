"use client";

import { useEventListener } from "@liveblocks/react/suspense";
import { claimWhiteboardAwardClient } from "@/lib/whiteboard/evidence";

type Props = {
  userId: string;
};

/** Applies durable client-side XP/gold when teacher awards a star. */
export function WhiteboardRewardListener({ userId }: Props) {
  useEventListener(({ event }) => {
    const payload = event as {
      type?: string;
      studentId?: string;
      awardId?: string;
    };
    if (payload.type !== "AWARD_STUDENT") return;
    if (payload.studentId !== userId || !payload.awardId) return;
    claimWhiteboardAwardClient({ awardId: payload.awardId });
  });
  return null;
}
