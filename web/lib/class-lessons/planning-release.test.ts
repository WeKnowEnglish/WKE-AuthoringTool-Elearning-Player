import { describe, expect, it } from "vitest";
import { lessonReadiness, stepPlanning } from "./planning";
import { normalizeClassLessonStepInputs, mapDbStepRow } from "./normalize";
import { homeworkFromReleasedStep, releasedLessonForTeaching, validateLessonMaterial, type LessonRelease } from "./release";
import type { ClassLessonStep } from "./types";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileLessonVocabularyMaterial } from "./compile-vocabulary";

function task(delivery: "classroom" | "homework" = "classroom"): ClassLessonStep {
  return { id: delivery, position: 0, kind: "custom", title: "Pair interview", phase: "communicative_practice", durationMinutes: 8,
    teacherAction: "PRIVATE: monitor hesitant learners", studentAction: "Ask and answer two questions about favorite food.",
    config: { materialNote: "picture cards", planning: { delivery, purpose: "Use the target vocabulary to communicate preferences.", successCriteria: "Ask two questions and give two relevant answers independently.", grouping: "pairs", scaffolding: "Model an exchange, then remove the frame." } } };
}
const plan = (steps = [task()]) => ({ objective: "Ask and answer about preferences", successCheck: "Independent exchange", durationMinutes: 10, steps });
const material = () => compileLessonVocabularyMaterial(createBakeryVocabularyListDocument(), ["v1", "v2"], "multiple_choice").pack;
function release(): LessonRelease {
  const home = task("homework");
  home.kind = "studio_activity";
  home.config = { ...home.config, activityId: "activity", activityTitle: "Check words", format: "multiple_choice", playPath: "https://untrusted.example/" };
  return { id: "release", lessonId: "lesson", classId: "class", teacherId: "teacher", createdAt: "2026-10-06T00:00:00Z", sourceUpdatedAt: "2026-10-05T00:00:00Z",
    snapshot: { lesson: { ...plan([task(), home]), id: "lesson", classId: "class", teacherId: "teacher", title: "Preferences", status: "ready", notes: "PRIVATE", targetLanguage: "food", templateKey: null, templateVersion: null, publishedAt: null, createdAt: "", updatedAt: "" },
      materials: { homework: { activityId: "activity", title: "Word check", format: "multiple_choice", pack: material() as unknown as Record<string, unknown> } } } };
}

describe("prepared lesson delivery", () => {
  it("accepts manual speaking tasks with instructions and a measurable check", () => {
    expect(lessonReadiness(plan()).ready).toBe(true);
    const missing = task(); missing.config.planning!.successCriteria = "";
    expect(lessonReadiness(plan([missing])).steps[0].issues).toContain("Add a success criterion or learning check for this task.");
  });
  it("separates homework effort from classroom time, including legacy homework phases", () => {
    expect(lessonReadiness(plan([task(), task("homework")]))).toMatchObject({ ready: true, classroomMinutes: 8, homeworkMinutes: 8 });
    const legacy = task(); delete legacy.config.planning; legacy.phase = "homework";
    expect(stepPlanning(legacy).delivery).toBe("homework");
    expect(lessonReadiness({ ...plan(), durationMinutes: 5 }).issues).toContain("Classroom steps exceed the lesson time. Adjust the sequence or target minutes.");
  });
  it("preserves planning and generation metadata through normalization and reload", () => {
    const step = task("homework");
    const normalized = normalizeClassLessonStepInputs([step])[0];
    const loaded = mapDbStepRow({ id: step.id, position: 0, kind: step.kind, title: step.title, phase: step.phase, duration_minutes: 8, teacher_action: step.teacherAction, student_action: step.studentAction, config: normalized.config });
    expect(loaded?.config.planning).toEqual(step.config.planning);
  });
  it("blocks incomplete goals, missing instructions, and unsupported pinned delivery", () => {
    const step = task(); step.studentAction = ""; step.config.planning!.purpose = "";
    expect(lessonReadiness({ ...plan([step]), objective: "Students will be able to…", successCheck: "" }).ready).toBe(false);
    step.kind = "live_game";
    expect(lessonReadiness(plan([step])).steps[0].issues.join(" ")).toContain("cannot be pinned");
    expect(() => validateLessonMaterial("vocabulary_list", {})).toThrow();
    expect(() => validateLessonMaterial("multiple_choice", {})).toThrow();
  });
  it("uses the reviewed material with safe local playback links and classroom order", () => {
    const snapshot = release(); snapshot.snapshot.lesson.steps[0].kind = "studio_activity";
    snapshot.snapshot.materials.classroom = structuredClone(snapshot.snapshot.materials.homework);
    const taught = releasedLessonForTeaching(snapshot);
    expect(taught.steps.map((step) => step.id)).toEqual(["classroom"]);
    expect((taught.steps[0].config as { playPath: string }).playPath).toBe("/teacher/lesson-releases/release/steps/classroom/play");
    expect(snapshot.snapshot.lesson.steps).toHaveLength(2);
  });
  it("freezes homework using reviewed content and learner-facing criteria, never teacher cues", () => {
    const snapshot = release();
    const prepared = homeworkFromReleasedStep(snapshot, snapshot.snapshot.lesson.steps[1]);
    expect(prepared.payload).toMatchObject({ type: "studio_activity", activityId: "activity", screenCount: 2, frozenAt: snapshot.createdAt });
    expect(prepared.instructions).toContain("Ask two questions");
    expect(prepared.instructions).toContain("Expected effort: 8 minutes");
    expect(JSON.stringify(prepared)).not.toContain("PRIVATE");
    const frozen = JSON.stringify(prepared.payload);
    snapshot.snapshot.materials.homework.pack = {};
    expect(JSON.stringify(prepared.payload)).toBe(frozen);
    expect(() => homeworkFromReleasedStep(snapshot, snapshot.snapshot.lesson.steps[0])).toThrow("Choose a homework step");
  });
  it("assigns an offline task as a student note without requiring a digital artifact", () => {
    const snapshot = release(); const manual = task("homework");
    const prepared = homeworkFromReleasedStep(snapshot, manual);
    expect(prepared.payload).toEqual({ type: "external_note", body: manual.studentAction });
  });
});
