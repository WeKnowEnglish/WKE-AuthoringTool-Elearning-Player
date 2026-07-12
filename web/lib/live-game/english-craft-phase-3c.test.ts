import { describe, expect, it } from "vitest";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  depositInteractLabel,
  harvestInteractLabel,
  harvestMcModalTitle,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  ENGLISH_CRAFT_RESOURCE_NODE_BY_ID,
  ENGLISH_CRAFT_STORAGE_BY_TYPE,
  toStorageInteractTarget,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { isPlayerCarrying } from "@/lib/live-game/server/player-carry";

describe("english-craft phase 3c harvest", () => {
  it("accepts all resource node ids in the node registry", () => {
    expect(ENGLISH_CRAFT_RESOURCE_NODE_BY_ID["tree-01"]).toBeDefined();
    expect(ENGLISH_CRAFT_RESOURCE_NODE_BY_ID["stone-01"]).toBeDefined();
    expect(ENGLISH_CRAFT_RESOURCE_NODE_BY_ID["wheat-01"]).toBeDefined();
    expect(ENGLISH_CRAFT_RESOURCE_NODE_BY_ID["cotton-01"]).toBeDefined();
  });

  it("builds harvest labels per resource type", () => {
    expect(harvestInteractLabel("wood", "Oak tree")).toBe("Chop Oak tree");
    expect(harvestInteractLabel("stone", "Stone")).toBe("Mine Stone");
    expect(harvestMcModalTitle("wheat")).toContain("wheat");
  });

  it("normalizes legacy wood award receipts", () => {
    expect(
      normalizeAwardReceipt({
        wood: 4,
        nodeCooldownEndsAt: 1000,
      }),
    ).toEqual({
      awardKind: "pool",
      resourceType: "wood",
      nodeCooldownEndsAt: 1000,
      poolCount: 4,
      wood: 4,
    });
  });

  it("normalizes carry award receipts", () => {
    expect(
      normalizeAwardReceipt({
        awardKind: "carry",
        resourceType: "stone",
        nodeCooldownEndsAt: 2000,
      }),
    ).toEqual({
      awardKind: "carry",
      resourceType: "stone",
      nodeCooldownEndsAt: 2000,
      poolCount: undefined,
    });
  });

  it("detects when a player is carrying", () => {
    expect(
      isPlayerCarrying(
        {
          session: {} as never,
          players: {},
          playerCarry: {
            "player-1": {
              resourceType: "wood",
              sourceNodeId: "tree-01",
              questionId: "adj-001",
              harvestedAt: 1,
            },
          },
        },
        "player-1",
      ),
    ).toBe(true);
    expect(isPlayerCarrying({ session: {} as never, players: {} }, "player-1")).toBe(false);
  });
});

describe("english-craft phase 3d deposit helpers", () => {
  it("maps storage interact targets with radius", () => {
    const target = toStorageInteractTarget(ENGLISH_CRAFT_STORAGE_BY_TYPE.wood);
    expect(target.interactRadius).toBe(72);
    expect(target.id).toBe("log-storage-01");
  });

  it("builds deposit interact labels", () => {
    expect(depositInteractLabel("wood")).toBe("Deposit wood");
    expect(depositInteractLabel("cotton")).toBe("Deposit cotton");
  });
});
