import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { generateLessonVocabularyActivity, getLessonVocabularyEditorContext } from "@/lib/actions/lesson-vocabulary";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), lesson: vi.fn(), source: vi.fn(), rpc: vi.fn(), revalidate: vi.fn(), custom: vi.fn(), platform: vi.fn(), overrides: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
vi.mock("@/lib/data/class-lessons", () => ({ getClassLesson: mocks.lesson }));
vi.mock("@/lib/studio-activities/load", () => ({ getStudioActivityForTeacher: mocks.source }));
vi.mock("@/lib/data/teacher-lexicon", () => ({ listTeacherLexiconEntries: mocks.custom }));
vi.mock("@/lib/data/platform-lexicon", () => ({ listPublishedPlatformSearchEntries: mocks.platform }));
vi.mock("@/lib/data/platform-lexicon-overrides", () => ({ listMasterLexiconOverrides: mocks.overrides }));
vi.mock("@/lib/vocabulary/primary-candidates", () => ({ getPrimaryVocabularySearchEntries: () => [] }));

const teacherId = "10000000-0000-4000-8000-000000000001";
const lessonId = "20000000-0000-4000-8000-000000000001";
const listId = "30000000-0000-4000-8000-000000000001";
const operationId = "40000000-0000-4000-8000-000000000001";
const lesson = { id: lessonId, teacherId, classId: teacherId, status: "draft", vocabularySources: [{ vocabListId: listId, name: "Bakery" }], steps: [] };
const request = { lessonId, vocabListId: listId, operationId, expectedUpdatedAt: "2026-10-06T00:00:00Z", selectedEntryIds: ["v1", "v2"], format: "multiple_choice" as const };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: teacherId, app_metadata: { role: "teacher" } } } });
  mocks.lesson.mockResolvedValue(lesson);
  mocks.source.mockResolvedValue({ id: listId, format: "vocabulary_list", authoring: createBakeryVocabularyListDocument(), updated_at: "2026-10-06T00:01:00Z" });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.custom.mockResolvedValue([]); mocks.platform.mockResolvedValue([]); mocks.overrides.mockResolvedValue([]);
});

describe("lesson vocabulary server boundary", () => {
  it("loads owned saved content and sends the validated pack, provenance, and source revision to one transaction", async () => {
    const result = await generateLessonVocabularyActivity(request);
    expect(result.ok).toBe(true);
    expect(mocks.source).toHaveBeenCalledWith(expect.anything(), teacherId, listId);
    const [rpc, args] = mocks.rpc.mock.calls[0]!;
    expect(rpc).toBe("add_class_lesson_vocabulary_activity");
    expect(args.p_step.id).toBe(operationId);
    expect(args.p_step.phase).toBe("assessment");
    expect(args.p_step.config.generation.recipe.selectedEntryIds).toEqual(["v1", "v2"]);
    expect(args.p_source_updated_at).toBe("2026-10-06T00:01:00Z");
    expect(args.p_pack.screens.length).toBeGreaterThan(0);
    expect(args.p_authoring.interaction.items[0].question).toContain("Food made from flour");
    expect(args.p_source.lessonGeneration.inputHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("derives the same activity identity for an uncertain retry", async () => {
    await generateLessonVocabularyActivity(request); await generateLessonVocabularyActivity(request);
    expect(mocks.rpc.mock.calls[1]![1].p_activity_id).toBe(mocks.rpc.mock.calls[0]![1].p_activity_id);
  });

  it("rejects students before accessing a lesson or source", async () => {
    mocks.auth.mockResolvedValue({ data: { user: { id: teacherId, app_metadata: { role: "student" } } } });
    const result = await generateLessonVocabularyActivity(request);
    expect(result).toMatchObject({ ok: false });
    expect(mocks.lesson).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects foreign lessons, unattached lists, and deleted source lists", async () => {
    mocks.lesson.mockResolvedValueOnce({ ...lesson, teacherId: listId });
    expect(await generateLessonVocabularyActivity(request)).toMatchObject({ ok: false, error: "Lesson not found or cannot be edited." });
    mocks.lesson.mockResolvedValueOnce({ ...lesson, vocabularySources: [] });
    expect(await generateLessonVocabularyActivity(request)).toMatchObject({ ok: false, error: expect.stringContaining("Attach") });
    mocks.source.mockResolvedValueOnce(null);
    expect(await generateLessonVocabularyActivity(request)).toMatchObject({ ok: false, error: expect.stringContaining("deleted") });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns content diagnostics and transaction conflicts without publishing", async () => {
    const list = createBakeryVocabularyListDocument(); list.entries[0] = { id: "v1", word: "bread" };
    mocks.source.mockResolvedValueOnce({ id: listId, format: "vocabulary_list", authoring: list });
    expect(await generateLessonVocabularyActivity(request)).toMatchObject({ ok: false, error: expect.stringContaining("definition or picture") });
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ error: { message: "This lesson changed in another session." } });
    expect(await generateLessonVocabularyActivity(request)).toMatchObject({ ok: false, error: "This lesson changed in another session." });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("loads the existing editor's teacher and platform dictionary context", async () => {
    const context = await getLessonVocabularyEditorContext();
    expect(context.initialTeacherLexicon).toEqual([]);
    expect(context.initialPlatformEntries).toEqual([]);
    expect(mocks.custom).toHaveBeenCalledOnce(); expect(mocks.platform).toHaveBeenCalledOnce(); expect(mocks.overrides).toHaveBeenCalledOnce();
  });
});
