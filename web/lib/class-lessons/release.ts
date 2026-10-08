import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import type { ClassLesson, ClassLessonStep, StudioActivityLessonStepConfig } from "./types";
import { stepPlanning } from "./planning";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";

export type ReleasedLessonMaterial = { activityId: string; title: string; format: "flashcards" | "multiple_choice"; pack: Record<string, unknown> };
export type LessonRelease = {
  id: string; lessonId: string; classId: string; teacherId: string;
  createdAt: string; sourceUpdatedAt: string;
  snapshot: { lesson: ClassLesson; materials: Record<string, ReleasedLessonMaterial> };
};

/** Use the same player parsers as the existing vocabulary generation path. */
export function validateLessonMaterial(format: string, pack: unknown): Record<string, unknown> {
  const validated = format === "flashcards" ? parseGamesFlashcardsLessonPlayerPack(pack)
    : format === "multiple_choice" ? parseGamesMcQuizLessonPlayerPack(pack) : null;
  if (!validated || !validated.screens.length) throw new Error("Pinned delivery supports playable flashcards and multiple-choice activities.");
  return structuredClone(validated) as unknown as Record<string, unknown>;
}

export function releasedPlayPath(releaseId: string, stepId: string): string {
  // Choose a known local route; never trust a persisted arbitrary playPath.
  return `/teacher/lesson-releases/${encodeURIComponent(releaseId)}/steps/${encodeURIComponent(stepId)}/play`;
}

export function releasedLessonForTeaching(release: LessonRelease): ClassLesson {
  const lesson = structuredClone(release.snapshot.lesson);
  lesson.steps = lesson.steps.filter((step) => stepPlanning(step).delivery === "classroom").map((step) => {
    const material = release.snapshot.materials[step.id];
    if (step.kind === "studio_activity" && material) {
      step.config = { ...step.config, playPath: releasedPlayPath(release.id, step.id) } as StudioActivityLessonStepConfig;
    }
    return step;
  });
  return lesson;
}

/** Freeze from the reviewed release, never from the mutable Bank row. */
export function homeworkFromReleasedStep(release: LessonRelease, step: ClassLessonStep): { payload: ClassHomeworkPayload; instructions: string } {
  const planning = stepPlanning(step);
  if (planning.delivery !== "homework") throw new Error("Choose a homework step from the released lesson.");
  const check = planning.successCriteria.trim() || ("successCriteria" in step.config ? String(step.config.successCriteria).trim() : "");
  const instructions = [step.studentAction, `Success criteria: ${check}`, `Expected effort: ${step.durationMinutes} minutes.`, planning.scaffolding ? `Support: ${planning.scaffolding}` : ""].filter(Boolean).join("\n\n");
  if (instructions.length > 2000) throw new Error("Shorten homework instructions, success criteria, or support to fit 2,000 characters together.");
  if (step.kind === "custom") return { payload: { type: "external_note", body: step.studentAction }, instructions };
  const material = release.snapshot.materials[step.id];
  if (step.kind !== "studio_activity" || !material) throw new Error("This homework material is missing from the release.");
  const pack = validateLessonMaterial(material.format, material.pack);
  return { payload: { type: "studio_activity", activityId: material.activityId, format: material.format, title: material.title, screenCount: (pack.screens as unknown[]).length, pack, frozenAt: release.createdAt }, instructions };
}
