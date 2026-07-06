import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completePracticeSession,
  readStudentPracticeSessionEvents,
  startPracticeSession,
} from "@/lib/student-session";
import { isGrammarPosterCompleted } from "./grammar-completion-status";

function installMemoryStorage() {
  const store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage: ls }));
}

describe("grammar-completion-status", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects completed grammar_poster sessions by slug", () => {
    const started = startPracticeSession({
      activityId: "short-answers-there-is-a1",
      activityKind: "grammar_poster",
      source: "student_hub",
      seed: "completion-test",
    });

    expect(isGrammarPosterCompleted("short-answers-there-is-a1")).toBe(false);

    completePracticeSession({
      sessionId: started.sessionId,
      result: "completed",
      summary: { practiceItemCount: 1 },
    });

    expect(isGrammarPosterCompleted("short-answers-there-is-a1")).toBe(true);

    const events = readStudentPracticeSessionEvents();
    expect(events.some((e) => e.type === "session_completed")).toBe(true);
  });
});
