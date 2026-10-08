// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassLessonEditor } from "@/components/teacher/class-hub/ClassLessonEditor";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import type { ClassLesson } from "@/lib/class-lessons/types";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";

const state = vi.hoisted(() => ({
  lists: new Map<string, unknown>(), saved: null as unknown,
  saves: vi.fn(), generate: vi.fn(), listSave: vi.fn(), context: vi.fn(),
}));
const listId = "30000000-0000-4000-8000-000000000001";
const createdId = "30000000-0000-4000-8000-000000000002";
vi.mock("@/lib/actions/class-lessons", () => ({
  saveClassLesson: state.saves, duplicateClassLesson: vi.fn(), archiveClassLesson: vi.fn(),
  publishClassLessonToClassroom: vi.fn(), unpublishClassLessonFromClassroom: vi.fn(),
}));
vi.mock("@/lib/actions/lesson-vocabulary", () => ({ generateLessonVocabularyActivity: state.generate, getLessonVocabularyEditorContext: state.context }));
vi.mock("@/lib/activity-library/vocabulary-list-studio", () => ({
  listStudioVocabularyLists: async () => [...state.lists.entries()].map(([id, document]) => ({ id, name: (document as VocabularyListDocument).name, updatedAt: "2026-10-06T00:00:00Z" })),
  getStudioVocabularyList: async (id: string) => ({ id, document: structuredClone(state.lists.get(id)) }),
  saveVocabularyListToStudio: state.listSave,
  deleteStudioVocabularyList: vi.fn(),
}));
vi.mock("@/lib/activity-library", async () => ({
  ...await import("@/lib/activity-library/vocabulary-list-studio"),
  listActivitiesGeneratedFromVocabList: async () => [],
  refreshActivitiesFromVocabList: vi.fn(), compileAndPublishQuizzesFromVocabList: vi.fn(),
  VOCAB_COMPILE_FORMAT_OPTIONS: [],
}));
vi.mock("@/components/teacher/class-hub/ClassLessonStepEditor", () => ({ ClassLessonStepEditor: () => null }));
vi.mock("@/components/teacher/activity-builder/VocabularyListLexiconPicker", () => ({ VocabularyListLexiconPicker: () => null }));
vi.mock("@/components/teacher/activity-builder/LexiconLinkedMediaStrip", () => ({ LexiconLinkedMediaStrip: () => null }));
vi.mock("@/components/teacher/activity-builder/VocabEntryAudioControls", () => ({ VocabEntryAudioControls: () => null }));
vi.mock("@/components/teacher/media/MediaUrlControls", () => ({ MediaUrlControls: () => null }));
vi.mock("@/lib/actions/lexicon-media", () => ({ linkLexiconMedia: vi.fn(), linkLexiconMediaByPublicUrl: vi.fn() }));
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return { default: (props: Record<string, unknown>) => createElement("a", props) };
});

let container: HTMLDivElement;
let root: Root;
const initialLesson = (): ClassLesson => ({
  id: "20000000-0000-4000-8000-000000000001", classId: "10000000-0000-4000-8000-000000000001",
  teacherId: "10000000-0000-4000-8000-000000000002", title: "Bakery lesson", status: "draft",
  notes: "Private", objective: "Recall bakery vocabulary", durationMinutes: 45, targetLanguage: "bread, cake",
  successCheck: "Recognize the meanings", templateKey: "blank", templateVersion: 1, publishedAt: null,
  createdAt: "2026-10-06T00:00:00Z", updatedAt: "2026-10-06T00:00:00Z", steps: [], vocabularySources: [],
});
async function render(lesson = state.saved as ClassLesson) {
  await act(async () => { root.render(createElement(ClassLessonEditor, {
    lesson, archivedClass: false, studioActivities: [], liveGameSets: [],
    onClose: vi.fn(), onSaved: (saved: ClassLesson) => { state.saved = structuredClone(saved); }, onDuplicated: vi.fn(), onArchived: vi.fn(),
  })); });
}
function button(label: string) {
  const found = [...container.querySelectorAll("button")].find((node) => node.textContent?.trim() === label);
  expect(found, `button ${label}`).toBeTruthy();
  return found!;
}
async function click(label: string) { await act(async () => { button(label).click(); }); }
async function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function waitForText(text: string) {
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(container.textContent).toContain(text);
  }, { timeout: 15_000 });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  state.lists.clear(); state.lists.set(listId, createBakeryVocabularyListDocument());
  state.saved = initialLesson();
  state.context.mockResolvedValue({ initialPlatformEntries: [], initialTeacherLexicon: [], showLexiconReviewLink: false });
  state.saves.mockImplementation(async (input) => {
    state.saved = { ...(state.saved as ClassLesson), ...input, id: input.lessonId, updatedAt: "2026-10-06T00:01:00Z" };
    return { ok: true, lesson: structuredClone(state.saved) };
  });
  state.generate.mockImplementation(async (input) => {
    const list = state.lists.get(input.vocabListId) as VocabularyListDocument;
    const lesson = state.saved as ClassLesson;
    lesson.steps.push({ id: input.operationId, position: lesson.steps.length, kind: "studio_activity", title: input.format === "flashcards" ? "Flashcards material" : "Check material", phase: input.format === "flashcards" ? "teach" : "assessment", durationMinutes: 5, teacherAction: "Model", studentAction: "Recall", config: {
      activityId: input.operationId, activityTitle: "Material", format: input.format,
      playPath: `/pilots/games-${input.format === "flashcards" ? "flashcards" : "mc-quiz"}?activity=${input.operationId}`,
      generation: { version: 1, adapterVersion: 1, lessonId: lesson.id, sourceName: list.name, inputHash: "a".repeat(64), generatedAt: "2026-10-06T00:00:00Z", recipe: { kind: "vocabulary_list", version: 1, vocabListId: input.vocabListId, format: input.format, selectedEntryIds: input.selectedEntryIds } },
    } });
    lesson.updatedAt = "2026-10-06T00:02:00Z";
    return { ok: true, lesson: structuredClone(lesson) };
  });
  state.listSave.mockImplementation(async (input) => {
    const id = input.activityId || createdId;
    state.lists.set(id, structuredClone(input.document));
    return { id, name: input.document.name, document: structuredClone(input.document), updatedAt: "2026-10-06T00:00:00Z" };
  });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => { root.unmount(); }); container.remove(); });

describe("teacher lesson vocabulary workflow", () => {
  it("attaches an existing list, generates two subsets, and reopens with recipes and previews", async () => {
    await render();
    await change(container.querySelector("select")!, listId);
    await click("Attach list");
    await waitForText("bread");
    await click("Generate flashcards");
    expect(state.generate.mock.calls[0]![0].selectedEntryIds).toEqual(["v1", "v2", "v3", "v4"]);
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    await act(async () => { checkboxes[2]!.click(); checkboxes[3]!.click(); });
    await click("Generate vocabulary check");
    expect(state.generate.mock.calls[1]![0].selectedEntryIds).toEqual(["v1", "v2"]);
    expect(state.saves.mock.calls[0]![0].vocabularySources).toEqual([{ vocabListId: listId, name: "Bakery vocabulary" }]);
    expect(state.saves.mock.calls[0]![0].expectedUpdatedAt).toBe("2026-10-06T00:00:00Z");
    await act(async () => { root.unmount(); }); root = createRoot(container);
    await render();
    await waitForText("Bakery vocabulary · 2 words");
    expect(container.querySelectorAll('a[target="_blank"]')).toHaveLength(4);
    expect((state.saved as ClassLesson).steps).toHaveLength(2);
  });

  it("creates and edits a new list through the actual vocabulary editor, then attaches it", async () => {
    await render();
    await act(async () => { await import("@/components/teacher/activity-builder/VocabularyListWorkspace"); });
    await click("+ Create vocabulary list");
    await waitForText("Add blank");
    await change(container.querySelector<HTMLInputElement>('[aria-label="List name"]')!, "My lesson words");
    await change(container.querySelector<HTMLInputElement>('[aria-label="Word"]')!, "cat");
    await change(container.querySelector<HTMLInputElement>('[aria-label="Definition"]')!, "A small pet that says meow.");
    await click("← Return to lesson");
    await waitForText("My lesson words");
    expect(state.listSave).toHaveBeenCalled();
    await click("Save lesson plan");
    expect((state.saved as ClassLesson).vocabularySources).toEqual([{ vocabListId: createdId, name: "My lesson words" }]);
    expect((state.lists.get(createdId) as VocabularyListDocument).entries[0]?.word).toBe("cat");
  }, 20_000);

  it("preserves the operation ID for retry and avoids a stale plan save after uncertainty", async () => {
    await render(); await change(container.querySelector("select")!, listId); await click("Attach list"); await waitForText("bread");
    state.generate.mockResolvedValueOnce({ ok: false, error: "Response interrupted. Retry." });
    await click("Generate flashcards");
    await waitForText("Response interrupted. Retry.");
    const originalOperation = state.generate.mock.calls[0]![0].operationId;
    await click("Generate flashcards");
    expect(state.generate.mock.calls[1]![0].operationId).toBe(originalOperation);
    expect(state.saves).toHaveBeenCalledTimes(1);
    expect((state.saved as ClassLesson).steps).toHaveLength(1);
  });
});
