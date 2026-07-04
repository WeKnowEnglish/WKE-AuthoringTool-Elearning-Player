import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAILY_LEARNING_LOOP_CONFIG,
  createLearningLoopCompletedEvent,
  createLearningLoopPhaseCompletedEvent,
  createLearningLoopPhaseStartedEvent,
  firstLearningLoopPhase,
  getLearningLoopPhaseConfig,
  nextLearningLoopPhase,
} from "@/lib/learning-loop";

describe("learning-loop", () => {
  it("defines the daily loop sequence and strand purpose", () => {
    expect(DEFAULT_DAILY_LEARNING_LOOP_CONFIG.phases.map((phase) => phase.phase)).toEqual([
      "STORY",
      "PRESENTATION",
      "EXPLORER",
      "REFLECTION",
    ]);
    expect(getLearningLoopPhaseConfig(DEFAULT_DAILY_LEARNING_LOOP_CONFIG, "EXPLORER")?.strandIds).toEqual([
      "meaning_focused_output",
      "fluency_development",
    ]);
  });

  it("advances phases linearly to complete", () => {
    expect(firstLearningLoopPhase(DEFAULT_DAILY_LEARNING_LOOP_CONFIG)).toBe("STORY");
    expect(nextLearningLoopPhase(DEFAULT_DAILY_LEARNING_LOOP_CONFIG, "STORY")).toBe(
      "PRESENTATION",
    );
    expect(nextLearningLoopPhase(DEFAULT_DAILY_LEARNING_LOOP_CONFIG, "REFLECTION")).toBe(
      "COMPLETE",
    );
  });

  it("creates phase lifecycle events", () => {
    const started = createLearningLoopPhaseStartedEvent({
      config: DEFAULT_DAILY_LEARNING_LOOP_CONFIG,
      sessionId: "session-1",
      phase: "STORY",
      startedAt: new Date("2026-07-04T08:00:00.000Z"),
    });
    const completed = createLearningLoopPhaseCompletedEvent({
      config: DEFAULT_DAILY_LEARNING_LOOP_CONFIG,
      sessionId: "session-1",
      phase: "STORY",
      elapsedMs: 1200,
      completionReason: "task",
      evidenceCount: 1,
      completedAt: new Date("2026-07-04T08:01:00.000Z"),
    });

    expect(started.strandIds).toEqual(["meaning_focused_input"]);
    expect(completed.elapsedMs).toBe(1200);
    expect(completed.evidenceCount).toBe(1);
  });

  it("creates a loop completion event with pet reward payload", () => {
    const event = createLearningLoopCompletedEvent({
      config: DEFAULT_DAILY_LEARNING_LOOP_CONFIG,
      sessionId: "session-1",
      elapsedMs: 17 * 60 * 1000,
    });

    expect(event.type).toBe("learning_loop_completed");
    expect(event.petCareReward).toEqual({ coins: 20, mysteryBoxCount: 1 });
  });
});

