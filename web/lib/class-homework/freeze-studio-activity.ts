import {
  homeworkStudioFormatLabel,
  isHomeworkStudioFormat,
  type ClassHomeworkPayload,
  type HomeworkStudioFormat,
} from "@/lib/class-homework/types";
import { freezeStudioPackForSpace } from "@/lib/teacher-space/freeze";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export {
  HOMEWORK_STUDIO_FORMATS,
  homeworkStudioFormatLabel,
  isHomeworkStudioFormat,
  type HomeworkStudioFormat,
} from "@/lib/class-homework/types";

/**
 * Freeze a validated Activity Bank pack into a `studio_activity` homework payload.
 * Supports quiz formats and learning tracks. Rejects vocabulary lists.
 */
export function freezeStudioActivityHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "studio_activity" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (!isHomeworkStudioFormat(input.format)) {
    throw new Error(
      "Only Activity Bank quiz formats and learning tracks can be assigned as Lesson Player homework. Vocabulary lists and document modules use a different assign path.",
    );
  }

  const frozen = freezeStudioPackForSpace(input.format, input.pack, input.titleHint);
  const view = spacePackToLessonScreens(frozen.format, frozen.pack, activityId);
  if (view.screens.length < 1) {
    throw new Error("This activity has no playable screens.");
  }

  return {
    type: "studio_activity",
    activityId,
    format: frozen.format as HomeworkStudioFormat,
    title: frozen.title || homeworkStudioFormatLabel(frozen.format as HomeworkStudioFormat),
    screenCount: view.screens.length,
    pack: frozen.pack,
    frozenAt: new Date().toISOString(),
  };
}
