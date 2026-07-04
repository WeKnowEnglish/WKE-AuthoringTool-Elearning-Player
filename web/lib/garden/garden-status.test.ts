import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import { getGardenAttentionHint } from "@/lib/garden/garden-status";
import { GROW_MS_BY_TIER } from "@/lib/garden/growth";

vi.mock("@/lib/progress/unlock-registry", () => ({
  isUnlockAvailable: vi.fn((id: string, level: number) => {
    if (id === "language_garden") return level >= 2;
    return true;
  }),
}));

describe("getGardenAttentionHint", () => {
  const now = 100_000;

  it("returns null when garden is locked", () => {
    const snap = emptyGardenSnapshot(now);
    expect(getGardenAttentionHint(snap, { playerLevel: 1, now })).toBeNull();
  });

  it("prioritizes ready crops to harvest", () => {
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      seedPouch: [{ id: "s1", tier: "common" as const, grantedAt: now, sourceEventId: "x" }],
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          {
            ...p,
            seedId: "crop-1",
            seedTier: "common" as const,
            plantedAt,
            growMultiplier: 1,
          }
        : p,
      ),
    };
    const hint = getGardenAttentionHint(snap, { playerLevel: 2, now });
    expect(hint?.kind).toBe("harvest_ready");
  });

  it("prioritizes clearing weeds over plain harvest", () => {
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) => {
        if (i === 0) {
          return {
            ...p,
            seedId: "crop-1",
            seedTier: "common" as const,
            plantedAt,
            growMultiplier: 1,
            weedWord: "CAT",
            weedRollDone: true,
          };
        }
        if (i === 1) {
          return {
            ...p,
            seedId: "crop-2",
            seedTier: "common" as const,
            plantedAt,
            growMultiplier: 1,
          };
        }
        return p;
      }),
    };
    const hint = getGardenAttentionHint(snap, { playerLevel: 2, now });
    expect(hint?.kind).toBe("clear_weed");
  });

  it("suggests planting when seeds are available", () => {
    const snap = {
      ...emptyGardenSnapshot(now),
      seedPouch: [{ id: "s1", tier: "common" as const, grantedAt: now, sourceEventId: "x" }],
    };
    const hint = getGardenAttentionHint(snap, { playerLevel: 2, now });
    expect(hint?.kind).toBe("plant_seeds");
  });

  it("suggests spelling when letters are available", () => {
    const snap = {
      ...emptyGardenSnapshot(now),
      letters: { C: 1, A: 1, T: 1 },
      seedPouch: [],
    };
    const hint = getGardenAttentionHint(snap, { playerLevel: 2, now });
    expect(hint?.kind).toBe("spell_words");
  });

  it("returns null when nothing needs attention", () => {
    const snap = {
      ...emptyGardenSnapshot(now),
      seedPouch: [],
      letters: {},
    };
    expect(getGardenAttentionHint(snap, { playerLevel: 2, now })).toBeNull();
  });
});
