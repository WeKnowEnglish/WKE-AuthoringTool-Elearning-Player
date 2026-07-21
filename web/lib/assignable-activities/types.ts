import type { ClassHomeworkPayload } from "@/lib/class-homework/types";

/** Registered assignable activity kinds. Extend when new adapters ship. */
export const ASSIGNABLE_ACTIVITY_KINDS = ["pack_mc_quiz", "pack_flashcards"] as const;
export type AssignableActivityKind = (typeof ASSIGNABLE_ACTIVITY_KINDS)[number];

export type AssignableActivityCard = {
  kind: AssignableActivityKind;
  artifactId: string;
  title: string;
  subtitle?: string;
  questionCount?: number;
  ready: boolean;
  sourceLabel: string;
  /** Optional pack id for pack-sourced activities (class-link UX). */
  packId?: string | null;
};

export type AssignableActivityStudentRenderer = "pack_mc_quiz" | "pack_flashcards";

export type AssignableActivityAdapter = {
  kind: AssignableActivityKind;
  label: string;
  listForClass: (classId: string) => Promise<AssignableActivityCard[]>;
  /** Build / freeze homework payload from artifact (writes today’s payload shapes). */
  toHomeworkPayload: (artifactId: string) => Promise<ClassHomeworkPayload>;
  studentRenderer: AssignableActivityStudentRenderer;
};

export function isAssignableActivityKind(value: unknown): value is AssignableActivityKind {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_ACTIVITY_KINDS as readonly string[]).includes(value)
  );
}
