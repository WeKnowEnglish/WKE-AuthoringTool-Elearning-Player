import { afterEach, describe, expect, it, vi } from "vitest";

const { mockFlush, mockNotify } = vi.hoisted(() => ({
  mockFlush: vi.fn().mockResolvedValue(undefined),
  mockNotify: vi.fn(),
}));

vi.mock("@/lib/mastery/supabase-sync", () => ({
  flushMasterySyncQueueForCurrentStudent: mockFlush,
}));

vi.mock("@/lib/secondary/secondary-session-events", () => ({
  notifySecondarySessionChanged: mockNotify,
}));

import { afterSecondaryActivityCompletion } from "@/lib/secondary/secondary-activity-completion";

describe("secondary-activity-completion", () => {
  afterEach(() => {
    mockFlush.mockClear();
    mockNotify.mockClear();
  });

  it("notifies session listeners and flushes the mastery sync queue", () => {
    afterSecondaryActivityCompletion();

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });
});
