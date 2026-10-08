import { z } from "zod";

export const TARGET_ROLES = [
  "introduce",
  "practise",
  "assess",
  "revisit",
] as const;
export const SKILL_FOCUSES = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
  "pronunciation",
] as const;
const id = z.string().uuid();
const text = (max = 1000) => z.string().trim().max(max);
const objectiveSchema = z.object({
  id,
  statement: text(),
  learnerStatement: text(),
  successCriteria: text(),
  evidenceMode: z.enum(["recognition", "recall", "production", "transfer"]),
});
const targetSchema = z.object({
  id,
  type: z.enum(["word", "phrase", "grammar", "skill", "learning_goal"]),
  key: text(200).min(1),
  label: text(200).min(1),
});
const resourceSchema = z
  .object({
    id,
    kind: z.enum(["vocabulary_list", "activity", "grammar", "media"]),
    sourceId: text(200).min(1),
    title: text(200),
    purpose: text(),
    selectedEntryIds: z.array(text(200).min(1)).max(500),
  })
  .superRefine((resource, ctx) => {
    const valid =
      resource.kind === "grammar"
        ? /^[a-z0-9]+(-[a-z0-9]+)*$/.test(resource.sourceId)
        : id.safeParse(resource.sourceId).success;
    if (!valid)
      ctx.addIssue({
        code: "custom",
        message: "Choose a valid saved library resource.",
      });
    if (
      new Set(resource.selectedEntryIds).size !==
      resource.selectedEntryIds.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Vocabulary selections must not contain duplicate entries.",
      });
  });
const lessonSchema = z.object({
  id,
  title: text(120).min(1),
  archived: z.boolean(),
  durationMinutes: z.number().int().min(5).max(240),
  objectiveIds: z.array(id).max(20),
  targetLanguage: text(1500),
  skills: z.array(z.enum(SKILL_FOCUSES)).max(7),
  prerequisites: z.array(id).max(50),
  support: text(1500),
  extension: text(1500),
  teacherTask: text(1500).default(""),
  targets: z
    .array(z.object({ targetId: id, role: z.enum(TARGET_ROLES) }))
    .max(200),
  resources: z.array(resourceSchema).max(20),
});
export const courseDocumentSchema = z
  .object({
    version: z.literal(1),
    title: text(120).min(1),
    audience: text(300),
    gradeRange: text(100),
    cefr: text(100),
    outcomes: text(3000),
    entryExpectations: text(1500),
    objectives: z.array(objectiveSchema).max(1000),
    targets: z.array(targetSchema).max(2000),
    units: z
      .array(
        z.object({
          id,
          title: text(120).min(1),
          outcome: text(1500),
          archived: z.boolean(),
          lessons: z.array(lessonSchema).max(100),
        }),
      )
      .max(100),
  })
  .superRefine((doc, ctx) => {
    const identities = [
      ...doc.units,
      ...doc.units.flatMap((u) => u.lessons),
      ...doc.objectives,
      ...doc.targets,
    ];
    if (new Set(identities.map((x) => x.id)).size !== identities.length)
      ctx.addIssue({
        code: "custom",
        message: "Course nodes must have unique IDs.",
      });
    const lessons = new Set(
      doc.units.flatMap((u) => u.lessons.map((l) => l.id)),
    );
    const objectives = new Set(doc.objectives.map((o) => o.id));
    const targets = new Set(doc.targets.map((t) => t.id));
    for (const lesson of doc.units.flatMap((u) => u.lessons)) {
      if (
        lesson.objectiveIds.some((x) => !objectives.has(x)) ||
        lesson.targets.some((x) => !targets.has(x.targetId)) ||
        lesson.prerequisites.some((x) => !lessons.has(x) || x === lesson.id)
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "A lesson contains an invalid objective, target, or prerequisite reference.",
        });
      }
      if (
        new Set(lesson.objectiveIds).size !== lesson.objectiveIds.length ||
        new Set(lesson.prerequisites).size !== lesson.prerequisites.length ||
        new Set(lesson.resources.map((r) => `${r.kind}:${r.sourceId}`)).size !==
          lesson.resources.length
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Remove duplicate lesson references.",
        });
      }
      if (
        new Set(lesson.targets.map((t) => `${t.targetId}:${t.role}`)).size !==
        lesson.targets.length
      )
        ctx.addIssue({
          code: "custom",
          message: "This target role is already mapped to the lesson.",
        });
    }
  });

export type CourseDocument = z.infer<typeof courseDocumentSchema>;
export type PlannedLesson = z.infer<typeof lessonSchema>;
export type CourseObjective = z.infer<typeof objectiveSchema>;
export type CourseTarget = z.infer<typeof targetSchema>;
export type CourseResource = z.infer<typeof resourceSchema>;
export type CourseUnit = CourseDocument["units"][number];
export type CourseMap = {
  id: string;
  teacherId: string;
  revision: number;
  archived: boolean;
  updatedAt: string;
  document: CourseDocument;
  sourceRevisions: Record<string, string>;
};
export type CourseProvenance = {
  mapId: string;
  mapTitle: string;
  revision: number;
  plannedLessonId: string;
  importedAt: string;
  resources: CourseResource[];
};
export type ResourceOption = {
  kind: CourseResource["kind"];
  sourceId: string;
  title: string;
  href: string;
  updatedAt: string;
  entries?: { id: string; word: string }[];
};
export const MAP_PATH = "/teacher/libraries/course-map";

export function blankCourse(title = "Untitled course"): CourseDocument {
  return {
    version: 1,
    title,
    audience: "",
    gradeRange: "",
    cefr: "",
    outcomes: "",
    entryExpectations: "",
    objectives: [],
    targets: [],
    units: [],
  };
}
export function blankPlannedLesson(title = "New lesson"): PlannedLesson {
  return {
    id: crypto.randomUUID(),
    title,
    archived: false,
    durationMinutes: 45,
    objectiveIds: [],
    targetLanguage: "",
    skills: [],
    prerequisites: [],
    support: "",
    extension: "",
    teacherTask: "",
    targets: [],
    resources: [],
  };
}
export function activeLessons(doc: CourseDocument) {
  return doc.units
    .filter((u) => !u.archived)
    .flatMap((u) => u.lessons.filter((l) => !l.archived));
}
export function lessonObjectives(doc: CourseDocument, lesson: PlannedLesson) {
  return doc.objectives.filter((o) => lesson.objectiveIds.includes(o.id));
}

/** Authoring readiness is deliberately independent of student achievement. */
export function planningIssues(
  doc: CourseDocument,
  lesson: PlannedLesson,
  available?: ResourceOption[],
): string[] {
  const goals = lessonObjectives(doc, lesson);
  const issues: string[] = [];
  if (!goals.length || goals.some((o) => !o.statement))
    issues.push("Add a learning objective");
  if (!goals.length || goals.some((o) => !o.successCriteria))
    issues.push("Add a success check");
  if (!lesson.resources.length && !lesson.teacherTask?.trim())
    issues.push("Link a resource or plan a teacher-led task");
  const sequence = activeLessons(doc);
  for (const prerequisite of lesson.prerequisites) {
    const position = sequence.findIndex((l) => l.id === prerequisite);
    if (
      position < 0 ||
      position >= sequence.findIndex((l) => l.id === lesson.id)
    )
      issues.push("Prerequisite is archived or comes later");
  }
  if (
    available &&
    lesson.resources.some(
      (r) =>
        !available.some((a) => a.kind === r.kind && a.sourceId === r.sourceId),
    )
  )
    issues.push("A resource is unavailable");
  return [...new Set(issues)];
}
export function coverageRows(doc: CourseDocument) {
  const lessons = activeLessons(doc);
  return doc.targets.map((target) => {
    const cells = lessons.map((lesson) =>
      lesson.targets.filter((t) => t.targetId === target.id).map((t) => t.role),
    );
    const roles = cells.flat();
    const introduced = cells.findIndex((c) => c.includes("introduce"));
    const warnings: string[] = [];
    if (!roles.length) warnings.push("Not mapped");
    if (!roles.includes("assess")) warnings.push("No planned assessment");
    if (
      introduced >= 0 &&
      !cells.some((c, i) => i > introduced && c.includes("revisit"))
    )
      warnings.push("No later revisit");
    return { target, cells, warnings };
  });
}
export function duplicatePlannedLesson(lesson: PlannedLesson): PlannedLesson {
  return {
    ...structuredClone(lesson),
    id: crypto.randomUUID(),
    title: `${lesson.title.slice(0, 112)} (copy)`,
    archived: false,
    resources: lesson.resources.map((r) => ({ ...r, id: crypto.randomUUID() })),
  };
}
export function duplicateUnit(unit: CourseUnit): CourseUnit {
  const lessons = unit.lessons.map(duplicatePlannedLesson);
  const ids = new Map(unit.lessons.map((l, i) => [l.id, lessons[i].id]));
  lessons.forEach((l) => {
    l.prerequisites = l.prerequisites.map((p) => ids.get(p) ?? p);
  });
  return {
    ...structuredClone(unit),
    id: crypto.randomUUID(),
    title: `${unit.title.slice(0, 112)} (copy)`,
    archived: false,
    lessons,
  };
}
export function resourceHref(
  resource: Pick<CourseResource, "kind" | "sourceId"> & { title?: string },
): string {
  const value = encodeURIComponent(resource.sourceId);
  if (resource.kind === "grammar") return `/teacher/grammar/${value}`;
  if (resource.kind === "media")
    return `/teacher/media?q=${encodeURIComponent(resource.title ?? "")}`;
  if (resource.kind === "vocabulary_list")
    return `/teacher/activity-builder/vocabulary-lists?activity=${value}`;
  return `/teacher/classes?bank=1&activity=${value}`;
}
