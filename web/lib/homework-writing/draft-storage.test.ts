import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHomeworkWritingDraft,
  homeworkWritingDraftKey,
  readHomeworkWritingDraft,
  writeHomeworkWritingDraft,
} from "@/lib/homework-writing/draft-storage";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  return store;
}

describe("homework writing draft storage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isolates drafts by both student and homework", () => {
    writeHomeworkWritingDraft(
      "student-a",
      "homework-1",
      "Student A draft",
      "2026-09-10T01:00:00.000Z",
    );
    writeHomeworkWritingDraft(
      "student-b",
      "homework-1",
      "Student B draft",
      "2026-09-10T02:00:00.000Z",
    );

    expect(readHomeworkWritingDraft("student-a", "homework-1")?.text).toBe(
      "Student A draft",
    );
    expect(readHomeworkWritingDraft("student-b", "homework-1")?.text).toBe(
      "Student B draft",
    );
    expect(readHomeworkWritingDraft("student-a", "homework-2")).toBeNull();
  });

  it("clears a recovered draft after a successful server save", () => {
    writeHomeworkWritingDraft("student-a", "homework-1", "Saved draft");
    clearHomeworkWritingDraft("student-a", "homework-1");
    expect(readHomeworkWritingDraft("student-a", "homework-1")).toBeNull();
  });

  it("removes the key when the student clears all text", () => {
    writeHomeworkWritingDraft("student-a", "homework-1", "Temporary draft");
    writeHomeworkWritingDraft("student-a", "homework-1", "");
    expect(localStorage.getItem(homeworkWritingDraftKey("student-a", "homework-1"))).toBeNull();
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem(homeworkWritingDraftKey("student-a", "homework-1"), "not-json");
    expect(readHomeworkWritingDraft("student-a", "homework-1")).toBeNull();
  });
});
