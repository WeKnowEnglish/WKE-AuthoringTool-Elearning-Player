import { describe, expect, it } from "vitest";
import {
  areAllRegisteredPlayersOnBoat,
  BOAT_BOARDING_DWELL_MS,
  countPlayersOnBoat,
  isBoatBoardingDwellComplete,
  isPlayerInBoatBoardingZone,
  updateBoatBoardingDwell,
} from "@/lib/live-game/engine/boat-boarding";
import { ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { canCompleteObjective, isBoatBoardingUnlocked } from "@/lib/live-game/server/read-storage";

describe("english-craft phase 4e boat boarding zone", () => {
  it("detects overlap inside the boarding zone", () => {
    const insideX = ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.x + 20;
    const insideY = ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.y + 20;
    expect(isPlayerInBoatBoardingZone(insideX, insideY, ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1)).toBe(
      true,
    );
  });

  it("does not detect overlap far from the boarding zone", () => {
    expect(isPlayerInBoatBoardingZone(0, 0, ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1)).toBe(false);
  });

  it("counts players currently inside the zone", () => {
    const insideX = ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.x + 20;
    const insideY = ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.y + 20;
    expect(
      countPlayersOnBoat(
        [
          { x: insideX, y: insideY },
          { x: 0, y: 0 },
        ],
        ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1,
      ),
    ).toBe(1);
  });
});

describe("english-craft phase 4e boarding dwell", () => {
  it("accumulates dwell only when everyone is on the boat", () => {
    let dwell = 0;
    dwell = updateBoatBoardingDwell(dwell, 2, 2, 500);
    expect(dwell).toBe(500);
    dwell = updateBoatBoardingDwell(dwell, 1, 2, 500);
    expect(dwell).toBe(0);
  });

  it("marks boarding ready after 2 seconds together", () => {
    expect(isBoatBoardingDwellComplete(BOAT_BOARDING_DWELL_MS - 1)).toBe(false);
    expect(isBoatBoardingDwellComplete(BOAT_BOARDING_DWELL_MS)).toBe(true);
  });
});

describe("english-craft phase 4e escape gates", () => {
  const readySession = {
    session: { phase: "playing" as const },
    unlockedObjects: { boat_boarding: true },
    players: {
      "player-1": { name: "A", color: "#fff", role: "player" as const, isReady: true, joinedAt: 1, avatarId: "boy" },
      "player-2": { name: "B", color: "#000", role: "player" as const, isReady: true, joinedAt: 2, avatarId: "boy" },
    },
    playerPositions: {
      "player-1": {
        x: ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.x + 20,
        y: ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.y + 20,
        updatedAt: 10_000,
      },
      "player-2": {
        x: ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.x + 30,
        y: ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1.y + 30,
        updatedAt: 10_000,
      },
    },
  };

  it("allows completion when boat boarding is unlocked", () => {
    expect(isBoatBoardingUnlocked(readySession)).toBe(true);
    expect(canCompleteObjective(readySession)).toBe(true);
  });

  it("blocks completion before the boat is crafted", () => {
    expect(
      canCompleteObjective({
        ...readySession,
        unlockedObjects: { boat_boarding: false },
      }),
    ).toBe(false);
  });

  it("requires every registered player to be on the boat with fresh positions", () => {
    const now = 12_000;
    expect(
      areAllRegisteredPlayersOnBoat(
        Object.keys(readySession.players),
        readySession.playerPositions,
        ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1,
        now,
      ),
    ).toBe(true);

    expect(
      areAllRegisteredPlayersOnBoat(
        Object.keys(readySession.players),
        {
          ...readySession.playerPositions,
          "player-2": { x: 0, y: 0, updatedAt: 10_000 },
        },
        ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1,
        now,
      ),
    ).toBe(false);
  });
});
