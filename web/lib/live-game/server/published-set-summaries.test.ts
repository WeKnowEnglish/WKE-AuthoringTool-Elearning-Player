import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();
const createClientMock = vi.fn(() => ({
  rpc: rpcMock,
  from: fromMock,
}));

vi.mock("@/lib/supabase/service-role-client", () => ({
  createServiceRoleSupabase: () => createClientMock(),
}));

import {
  fetchPublishedSetSummariesWithMeta,
  publishedSetSummaryContainsQuestionContent,
} from "@/lib/live-game/server/published-set-summaries";

describe("published set summaries query strategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockImplementation(() => ({
      rpc: rpcMock,
      from: fromMock,
    }));
  });

  it("uses the aggregate RPC when available (single query)", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          slug: "daily-routines-a1",
          title: "Daily Routines",
          level: "A1",
          topic: "Routines",
          learning_objective: "Describe routines.",
          description: "Morning routines.",
          version: 1,
          visibility: "system",
          sort_order: 1,
          harvest_count: 6,
          deposit_count: 6,
          craft_count: 1,
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          slug: "empty-set",
          title: "Empty",
          level: "A1",
          topic: "",
          learning_objective: "",
          description: "",
          version: 1,
          visibility: "system",
          sort_order: 2,
          harvest_count: 0,
          deposit_count: 0,
          craft_count: 0,
        },
      ],
      error: null,
    });

    const result = await fetchPublishedSetSummariesWithMeta();
    expect(result.queryStrategy).toBe("rpc_aggregate");
    expect(result.queryCount).toBe(1);
    expect(result.resultCount).toBe(2);
    expect(result.summaries[0]?.harvestCount).toBe(6);
    expect(result.summaries[1]?.harvestCount).toBe(0);
    expect(publishedSetSummaryContainsQuestionContent(result.summaries[0])).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("falls back to a two-query batch when the RPC is unavailable", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "function missing" } });

    const sets = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        slug: "multi-bank",
        title: "Multi",
        level: "A2",
        topic: "Adj",
        learning_objective: "Use adjectives.",
        description: "Practice.",
        version: 2,
        status: "published",
        visibility: "system",
        sort_order: 1,
      },
    ];
    const bankRows = [
      { set_id: sets[0]!.id, bank: "harvest" },
      { set_id: sets[0]!.id, bank: "harvest" },
      { set_id: sets[0]!.id, bank: "deposit" },
      { set_id: sets[0]!.id, bank: "craft" },
    ];

    let call = 0;
    fromMock.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        const thenable: Record<string, unknown> = {};
        thenable.select = vi.fn(() => thenable);
        thenable.eq = vi.fn(() => thenable);
        thenable.order = vi.fn(() => thenable);
        thenable.then = (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: sets, error: null }).then(onFulfilled);
        return thenable;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: bankRows, error: null }),
      };
    });

    const result = await fetchPublishedSetSummariesWithMeta();
    expect(result.queryStrategy).toBe("two_query_batch");
    expect(result.queryCount).toBe(2);
    expect(result.summaries).toHaveLength(1);
    expect(result.summaries[0]).toMatchObject({
      harvestCount: 2,
      depositCount: 1,
      craftCount: 1,
    });
    expect(publishedSetSummaryContainsQuestionContent(result.summaries[0])).toBe(false);
  });

  it("returns empty_service when the service role client is missing", async () => {
    createClientMock.mockReturnValue(null);
    const result = await fetchPublishedSetSummariesWithMeta();
    expect(result.queryStrategy).toBe("empty_service");
    expect(result.queryCount).toBe(0);
    expect(result.summaries).toEqual([]);
  });

  it("aggregates multiple banks correctly for many sets without N+1", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "missing" } });
    const sets = Array.from({ length: 5 }, (_, index) => ({
      id: `00000000-0000-0000-0000-00000000000${index}`,
      slug: `set-${index}`,
      title: `Set ${index}`,
      level: "A1" as const,
      topic: "",
      learning_objective: "",
      description: "",
      version: 1,
      status: "published" as const,
      visibility: "system" as const,
      sort_order: index,
    }));
    const bankRows = sets.flatMap((set) => [
      { set_id: set.id, bank: "harvest" },
      { set_id: set.id, bank: "deposit" },
    ]);

    let fromCalls = 0;
    fromMock.mockImplementation(() => {
      fromCalls += 1;
      if (fromCalls === 1) {
        const thenable: Record<string, unknown> = {};
        thenable.select = vi.fn(() => thenable);
        thenable.eq = vi.fn(() => thenable);
        thenable.order = vi.fn(() => thenable);
        thenable.then = (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: sets, error: null }).then(onFulfilled);
        return thenable;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: bankRows, error: null }),
      };
    });

    const result = await fetchPublishedSetSummariesWithMeta();
    expect(result.queryCount).toBe(2);
    expect(fromCalls).toBe(2);
    expect(result.summaries).toHaveLength(5);
    expect(result.summaries.every((summary) => summary.harvestCount === 1)).toBe(true);
  });
});

describe("published summary payload safety", () => {
  it("detects forbidden question content keys", () => {
    expect(publishedSetSummaryContainsQuestionContent({ prompt: "Hello?" })).toBe(true);
    expect(publishedSetSummaryContainsQuestionContent({ payload: {} })).toBe(true);
    expect(
      publishedSetSummaryContainsQuestionContent({
        id: "x",
        title: "Safe",
        harvestCount: 1,
      }),
    ).toBe(false);
  });
});
