import { describe, expect, it, vi } from "vitest";
import { createLatestOnlyWorkQueue } from "@/lib/classroom-realtime/server/latest-only-queue";

describe("latest-only background work queue", () => {
  it("coalesces a burst into one call using the latest payload", async () => {
    vi.useFakeTimers();
    const work = vi.fn(async (_value: string) => undefined);
    const queue = createLatestOnlyWorkQueue({ delayMs: 100, work });

    const first = queue.enqueue("session-1", "first");
    const second = queue.enqueue("session-1", "latest");
    await vi.advanceTimersByTimeAsync(100);
    await Promise.all([first, second]);

    expect(work).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledWith("latest");
    vi.useRealTimers();
  });
});
