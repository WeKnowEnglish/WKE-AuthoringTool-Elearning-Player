import type { ClassLesson, ClassLessonStep, StudioActivityLessonStepConfig } from "./types";

export type LessonStepPlanning = {
  delivery: "classroom" | "homework";
  purpose: string;
  successCriteria: string;
  grouping: "individual" | "pairs" | "groups" | "whole_class";
  scaffolding: string;
};

export function normalizeLessonStepPlanning(raw: unknown): LessonStepPlanning | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const text = (key: string) => typeof value[key] === "string" ? value[key].trim().slice(0, 1500) : "";
  return {
    delivery: value.delivery === "homework" ? "homework" : "classroom",
    purpose: text("purpose"), successCriteria: text("successCriteria"), scaffolding: text("scaffolding"),
    grouping: value.grouping === "pairs" || value.grouping === "groups" || value.grouping === "whole_class" ? value.grouping : "individual",
  };
}

export function stepPlanning(step: Pick<ClassLessonStep, "phase" | "config">): LessonStepPlanning {
  return normalizeLessonStepPlanning(step.config.planning) ?? {
    delivery: step.phase === "homework" ? "homework" : "classroom",
    purpose: "", successCriteria: "", grouping: "individual", scaffolding: "",
  };
}

type PlanningStep = Omit<ClassLessonStep, "position">;
export type LessonReadiness = {
  ready: boolean;
  issues: string[];
  steps: { stepId: string; ready: boolean; issues: string[] }[];
  classroomMinutes: number;
  homeworkMinutes: number;
};

/** Checks preparation, not student mastery. Manual tasks are first-class learning. */
export function lessonReadiness(lesson: Pick<ClassLesson, "objective" | "successCheck" | "durationMinutes"> & { steps: PlanningStep[] }): LessonReadiness {
  const issues: string[] = [];
  if (!lesson.objective.trim() || /…$/.test(lesson.objective.trim())) issues.push("Write a specific learning goal.");
  if (!lesson.successCheck.trim()) issues.push("Describe how you will check the learning goal.");
  if (!lesson.steps.length) issues.push("Add a teaching sequence.");
  let classroomMinutes = 0;
  let homeworkMinutes = 0;
  const steps = lesson.steps.map((step) => {
    const planning = stepPlanning(step);
    if (planning.delivery === "homework") homeworkMinutes += step.durationMinutes;
    else classroomMinutes += step.durationMinutes;
    const problems: string[] = [];
    if (!step.studentAction.trim()) problems.push("Add student instructions.");
    if (!planning.purpose.trim()) problems.push("Explain how this step supports the learning goal.");
    const check = planning.successCriteria.trim() || ("successCriteria" in step.config ? String(step.config.successCriteria).trim() : "");
    if (!check && (step.kind === "custom" || step.phase === "assessment" || planning.delivery === "homework")) problems.push("Add a success criterion or learning check for this task.");
    if (step.kind === "studio_activity") {
      const config = step.config as StudioActivityLessonStepConfig;
      if (!config.activityId) problems.push("Attach a saved activity.");
      if (config.format !== "flashcards" && config.format !== "multiple_choice") problems.push("Pinned delivery currently supports flashcards and multiple choice. Use a teacher-led step for this material.");
    }
    if (step.kind === "live_game") problems.push("Live Game sets cannot be pinned yet. Use a teacher-led step or a supported Bank activity.");
    if (planning.delivery === "homework" && step.kind !== "custom" && step.kind !== "studio_activity") problems.push("Use a Bank activity or a teacher-led task for homework.");
    if (planning.delivery === "homework") {
      const instructions = [step.studentAction, `Success criteria: ${check}`, `Expected effort: ${step.durationMinutes} minutes.`, planning.scaffolding ? `Support: ${planning.scaffolding}` : ""].filter(Boolean).join("\n\n");
      if (instructions.length > 2000) problems.push("Shorten homework instructions, success criteria, or support to fit 2,000 characters together.");
    }
    return { stepId: step.id, ready: !problems.length, issues: problems };
  });
  if (!lesson.steps.some((step) => stepPlanning(step).delivery === "classroom")) issues.push("Add at least one classroom step.");
  if (classroomMinutes > lesson.durationMinutes) issues.push("Classroom steps exceed the lesson time. Adjust the sequence or target minutes.");
  return { ready: !issues.length && steps.every((step) => step.ready), issues, steps, classroomMinutes, homeworkMinutes };
}
