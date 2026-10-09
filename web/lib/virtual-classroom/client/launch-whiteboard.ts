"use client";

import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { startAppDiagnosticSpan } from "@/lib/app-diagnostics/client";
import { setWhiteboardSessionContext, type WhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

/** Host opens (or reopens) the shared class board room without leaving Learn. */
export async function launchWhiteboardInLearn(input: {
  sessionId: string;
  displayName: string;
  background?: {
    url: string;
    assetId?: string | null;
    title?: string;
  };
}): Promise<WhiteboardSessionContext> {
  const finishJourney = startAppDiagnosticSpan(
    "teacher",
    "virtual-classroom",
    input.background ? "classroom_picture_add" : "classroom_board_launch",
    { sessionId: input.sessionId },
  );
  try {
  const res = await diagnosticFetch(
    `/api/virtual-classroom/${input.sessionId}/whiteboard`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.background?.title?.trim() || "Class board",
        instructions: input.background
          ? "Look closely and annotate the picture together."
          : "Draw and share ideas together.",
        timerMinutes: 60,
        worksheetPresetId: null,
        mode: "individual",
      }),
    },
    {
      phase: "launch",
      name: "vc.launch_class_board",
      detail: {
        activity: "classroom",
        sessionId: input.sessionId,
        commandType: "LAUNCH_CLASS_BOARD",
      },
    },
  );
  const payload = (await res.json()) as {
    error?: string;
    sessionId?: string;
    roomId?: string;
    userId?: string;
    displayName?: string;
  };
  if (!res.ok || !payload.sessionId || !payload.roomId || !payload.userId) {
    throw new Error(payload.error ?? "Could not open the class board.");
  }
  const next: WhiteboardSessionContext = {
    sessionId: payload.sessionId,
    roomId: payload.roomId,
    role: "host",
    displayName: payload.displayName ?? input.displayName,
    color: "#0f172a",
    userId: payload.userId,
  };
  setWhiteboardSessionContext(next);
  if (input.background) {
    const backgroundResponse = await diagnosticFetch(
      `/api/whiteboard/${encodeURIComponent(payload.sessionId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SET_BACKGROUND",
          assetId: input.background.assetId ?? null,
          url: input.background.url,
          fit: "contain",
          opacity: 1,
        }),
      },
      {
        phase: "launch",
        name: "vc.set_class_board_background",
        detail: {
          activity: "whiteboard",
          sessionId: input.sessionId,
          roomId: payload.roomId,
          commandType: "SET_BACKGROUND",
        },
      },
    );
    if (!backgroundResponse.ok) {
      const backgroundPayload = (await backgroundResponse.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        backgroundPayload?.error ?? "The board opened, but the picture could not be added.",
      );
    }
  }
  finishJourney({ hasBackground: Boolean(input.background) });
  return next;
  } catch (journeyError) {
    finishJourney(undefined, journeyError);
    throw journeyError;
  }
}
