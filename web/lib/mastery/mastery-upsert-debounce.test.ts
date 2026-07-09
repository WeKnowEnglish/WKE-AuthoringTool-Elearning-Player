import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import {
  flushScheduledMasteryUpserts,
  MASTERY_UPSERT_DEBOUNCE_MS,
  resetMasteryUpsertDebounceForTests,
  scheduleMasteryUpsert,
  setMasteryUpsertFlushHandler,
} from "@/lib/mastery/mastery-upsert-debounce";

const studentId = "a1111111-1111-4111-8111-111111111111";
const target = { type: "word" as const, key: "word-a", label: "a" };

afterEach(() => {
  resetMasteryUpsertDebounceForTests();
  vi.useRealTimers();
});

describe("mastery upsert debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setMasteryUpsertFlushHandler(async () => {});
  });

  it("coalesces multiple schedules for the same target key", async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    setMasteryUpsertFlushHandler(flush);

    const first = createEmptyMasteryRecord({ studentId, target });
    first.masteryScore = 0.3;
    const second = createEmptyMasteryRecord({ studentId, target });
    second.masteryScore = 0.8;

    scheduleMasteryUpsert(studentId, first);
    scheduleMasteryUpsert(studentId, second);

    await vi.advanceTimersByTimeAsync(MASTERY_UPSERT_DEBOUNCE_MS);

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush.mock.calls[0]?.[1]).toHaveLength(1);
    expect(flush.mock.calls[0]?.[1]?.[0]?.masteryScore).toBe(0.8);
  });

  it("flushes immediately when flushScheduledMasteryUpserts is called", async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    setMasteryUpsertFlushHandler(flush);

    const record = createEmptyMasteryRecord({ studentId, target });
    scheduleMasteryUpsert(studentId, record);
    await flushScheduledMasteryUpserts(studentId);

    expect(flush).toHaveBeenCalledTimes(1);
  });
});
