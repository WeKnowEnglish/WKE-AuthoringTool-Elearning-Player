import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildHostSeededInitialRoot,
  buildHostSeededStorageFields,
  hostRoomMetadata,
  isValidHostCreationId,
  measureInitialStoragePayload,
} from "@/lib/live-game/server/host-room-bootstrap";
import {
  clearSafeLiveGameQuestionBundleCacheForTests,
  getOrBuildSafeLiveGameQuestionBundle,
} from "@/lib/live-game/server/question-bundle";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";

function source(relativeUrl: string) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

describe("host room bootstrap helpers", () => {
  const input = {
    roomId: "wke-live-game-ABC123",
    hostUserId: "11111111-1111-4111-8111-111111111111",
    displayName: "Teacher",
    avatarId: "dog",
    classId: null,
    classTitle: null,
    joinCode: "ABC123",
    modeId: "english_craft" as const,
    mapId: "english-craft-v1",
    durationMinutes: 20 as const,
    questionSetId: "22222222-2222-4222-8222-222222222222",
    questionSetVersion: 1,
  };

  it("validates creation ids", () => {
    expect(isValidHostCreationId("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isValidHostCreationId("not-a-uuid")).toBe(false);
  });

  it("seeds host player and position exactly once in initial fields", () => {
    const fields = buildHostSeededStorageFields(input);
    expect(fields.players.get(input.hostUserId)?.get("role")).toBe("host");
    expect(fields.playerPositions.get(input.hostUserId)).toBeTruthy();
    expect(fields.session.get("phase")).toBe("lobby");
    expect(fields.session.get("questionSetId")).toBe(input.questionSetId);
    expect(fields.resourceNodes.size).toBeGreaterThan(0);
  });

  it("serializes a PlainLson root and reports field bytes", () => {
    const root = buildHostSeededInitialRoot(input);
    const measured = measureInitialStoragePayload(root);
    expect(measured.plain.liveblocksType).toBe("LiveObject");
    expect(measured.initialStorageBytes).toBeGreaterThan(100);
    expect(measured.topLevelStorageFieldCount).toBeGreaterThanOrEqual(10);
    expect(measured.topLevelStorageFieldBytes.session).toBeGreaterThan(0);
    expect(measured.topLevelStorageFieldBytes.resourceNodes).toBeGreaterThan(0);
    const serialized = JSON.stringify(measured.plain);
    expect(serialized).not.toContain("correctAnswers");
    expect(serialized).not.toContain("targetWord");
    expect(serialized).not.toContain("correctOrder");
  });

  it("builds searchable room metadata for creationId reuse", () => {
    expect(
      hostRoomMetadata({
        creationId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        teacherId: input.hostUserId,
        joinCode: "ABC123",
        initStatus: "ready",
      }),
    ).toEqual({
      creationId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      teacherId: input.hostUserId,
      joinCode: "ABC123",
      initStatus: "ready",
    });
  });
});

describe("host/join route contracts", () => {
  it("host prefers initializeStorageDocument and creationId reuse", () => {
    const host = source("../../../app/api/live-game/sessions/host/route.ts");
    const bootstrap = source("./host-room-bootstrap.ts");
    expect(bootstrap).toContain("initializeStorageDocument");
    expect(bootstrap).toContain("mutate_storage_fallback");
    expect(host).toContain("findHostRoomByCreationId");
    expect(host).toContain("creationId");
    expect(host).toContain("reused_ready_room");
    expect(host).toContain("deleteRoom");
  });

  it("join uses a single liveblocks_read stage under the lock", () => {
    const join = source("../../../app/api/live-game/sessions/join/route.ts");
    const reads = join.match(/measure\("liveblocks_read"/g) ?? [];
    expect(reads).toHaveLength(1);
    expect(join).toContain("if (!players?.get(playerId))");
    expect(join).toContain("storageSnapshotReused");
  });

  it("client retains creationId across host retries", () => {
    const page = source("../../../components/live-game/LiveGameHostPage.tsx");
    expect(page).toContain("creationIdRef");
    expect(page).toContain("creationId");
    expect(page).toContain("creationIdRef.current = null");
  });
});

describe("safe question bundle cache", () => {
  it("reuses immutable banks by questionSetId+version without answers", () => {
    clearSafeLiveGameQuestionBundleCacheForTests();
    const snapshot = buildSystemSnapshotFromSeeds("grade56-adjectives");
    const first = getOrBuildSafeLiveGameQuestionBundle({
      roomId: "wke-live-game-AAAAAA",
      questionSetId: snapshot.id,
      questionSetVersion: snapshot.version,
      snapshot,
    });
    expect(first.bundleCacheOutcome).toBe("miss");
    const second = getOrBuildSafeLiveGameQuestionBundle({
      roomId: "wke-live-game-BBBBBB",
      questionSetId: snapshot.id,
      questionSetVersion: snapshot.version,
      snapshot,
    });
    expect(second.bundleCacheOutcome).toBe("hit");
    expect(second.bundle.roomId).toBe("wke-live-game-BBBBBB");
    expect(JSON.stringify(second.bundle)).not.toContain("correctAnswers");
  });
});
