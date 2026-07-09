import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendSyncDebugEvent,
  MAX_SYNC_DEBUG_EVENTS,
  readSyncDebugEvents,
  resetSyncDebugLogForTests,
  subscribeSyncDebugEvents,
} from "@/lib/mastery/sync-debug-log";

afterEach(() => {
  resetSyncDebugLogForTests();
});

describe("sync-debug-log", () => {
  it("stores events newest-first", () => {
    appendSyncDebugEvent({
      level: "info",
      op: "pull",
      message: "first",
    });
    appendSyncDebugEvent({
      level: "warn",
      op: "queue_flush",
      message: "second",
    });

    const events = readSyncDebugEvents();
    expect(events).toHaveLength(2);
    expect(events[0]?.message).toBe("second");
    expect(events[1]?.message).toBe("first");
  });

  it("caps at MAX_SYNC_DEBUG_EVENTS", () => {
    for (let i = 0; i < MAX_SYNC_DEBUG_EVENTS + 5; i += 1) {
      appendSyncDebugEvent({
        level: "info",
        op: "hydrate",
        message: `event-${i}`,
      });
    }

    const events = readSyncDebugEvents();
    expect(events).toHaveLength(MAX_SYNC_DEBUG_EVENTS);
    expect(events[0]?.message).toBe(`event-${MAX_SYNC_DEBUG_EVENTS + 4}`);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSyncDebugEvents(listener);

    appendSyncDebugEvent({
      level: "info",
      op: "backlog",
      message: "pushed",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();

    appendSyncDebugEvent({
      level: "error",
      op: "evidence_push",
      message: "failed",
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
