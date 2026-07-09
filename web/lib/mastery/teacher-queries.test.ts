import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import { masteryRecordToRow } from "@/lib/mastery/supabase-rows";
import {
  getClassMasteryOverviewForTeacher,
  getStudentMasteryDiagnosticForTeacher,
  requireTeacherUser,
  TeacherMasteryAccessError,
} from "@/lib/mastery/teacher-queries";

const teacherId = "b2222222-2222-4222-8222-222222222222";
const studentA = "a1111111-1111-4111-8111-111111111111";
const studentB = "c3333333-3333-4333-8333-333333333333";
const classId = "d4444444-4444-4444-8444-444444444444";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function teacherUser() {
  return { id: teacherId, app_metadata: { role: "teacher" } };
}

function masteryRow(studentId: string, wordId: string, masteryScore: number) {
  const record = createEmptyMasteryRecord({
    studentId,
    target: { type: "word", key: wordId, label: wordId },
  });
  record.masteryScore = masteryScore;
  record.exposureCount = 3;
  record.updatedAt = "2026-07-09T08:00:00.000Z";
  const row = masteryRecordToRow(studentId, record);
  return {
    id: `00000000-0000-4000-8000-${wordId.slice(-12).padStart(12, "0")}`,
    created_at: record.updatedAt,
    ...row,
    record,
  };
}

function installMasterySelect(rows: ReturnType<typeof masteryRow>[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("teacher-queries", () => {
  it("requires a teacher user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: studentA, app_metadata: { role: "student" } } } });
    await expect(requireTeacherUser()).rejects.toBeInstanceOf(TeacherMasteryAccessError);
  });

  it("builds a student diagnostic from fetched rows", async () => {
    mockGetUser.mockResolvedValue({ data: { user: teacherUser() } });
    installMasterySelect([
      masteryRow(studentA, "word-low", 0.2),
      masteryRow(studentA, "word-high", 0.9),
    ]);

    const diagnostic = await getStudentMasteryDiagnosticForTeacher(studentA);
    expect(diagnostic.studentId).toBe(studentA);
    expect(diagnostic.recordCount).toBe(2);
    expect(diagnostic.weakWords[0]?.targetKey).toContain("word-low");
  });

  it("returns class overview previews for each student id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: teacherUser() } });
    installMasterySelect([
      masteryRow(studentA, "word-a", 0.2),
      masteryRow(studentB, "word-b", 0.8),
    ]);

    const overview = await getClassMasteryOverviewForTeacher(classId, [studentA, studentB]);
    expect(overview.classId).toBe(classId);
    expect(overview.students).toHaveLength(2);
    expect(overview.students[0]?.studentId).toBe(studentA);
    expect(overview.students[1]?.recordCount).toBe(1);
  });

  it("returns empty diagnostic when student has no rows", async () => {
    mockGetUser.mockResolvedValue({ data: { user: teacherUser() } });
    installMasterySelect([]);

    const diagnostic = await getStudentMasteryDiagnosticForTeacher(studentA);
    expect(diagnostic.recordCount).toBe(0);
    expect(diagnostic.weakWords).toEqual([]);
  });
});
