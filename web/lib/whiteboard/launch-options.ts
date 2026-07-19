/**
 * Pure helpers for Virtual Classroom whiteboard launch (WB-5).
 */

import { WORKSHEET_PRESETS, type WhiteboardMode } from "@/lib/whiteboard/domain";

export type WhiteboardLaunchPayload = {
  title: string;
  instructions: string;
  timerMinutes: number;
  worksheetPresetId: string | null;
  mode: WhiteboardMode;
};

export const WHITEBOARD_LAUNCH_MODE_OPTIONS: {
  value: WhiteboardMode;
  label: string;
}[] = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "teacher_demo", label: "Teacher demo" },
];

export const WHITEBOARD_TIMER_OPTIONS_MINUTES = [2, 3, 4, 5, 8, 10] as const;

const DEFAULT_TITLE = "Whiteboard activity";
const DEFAULT_INSTRUCTIONS = "Use the tools. Submit when you are done.";

export function normalizeWhiteboardLaunchPayload(
  input: Partial<WhiteboardLaunchPayload> | null | undefined,
): WhiteboardLaunchPayload {
  const mode: WhiteboardMode =
    input?.mode === "group" || input?.mode === "teacher_demo" || input?.mode === "individual"
      ? input.mode
      : "individual";

  const worksheetPresetId =
    typeof input?.worksheetPresetId === "string" &&
    WORKSHEET_PRESETS.some((p) => p.id === input.worksheetPresetId)
      ? input.worksheetPresetId
      : input?.worksheetPresetId === null
        ? null
        : (WORKSHEET_PRESETS[0]?.id ?? null);

  const rawMinutes =
    typeof input?.timerMinutes === "number" && Number.isFinite(input.timerMinutes)
      ? input.timerMinutes
      : 4;
  const timerMinutes = Math.min(30, Math.max(1, Math.round(rawMinutes)));

  return {
    mode,
    worksheetPresetId,
    timerMinutes,
    title: (input?.title ?? "").trim() || DEFAULT_TITLE,
    instructions: (input?.instructions ?? "").trim() || DEFAULT_INSTRUCTIONS,
  };
}

export function whiteboardLaunchStartLabel(mode: WhiteboardMode): string {
  if (mode === "group") return "Start group whiteboard";
  if (mode === "teacher_demo") return "Start teacher demo";
  return "Start whiteboard activity";
}
