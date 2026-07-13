import { describe, expect, it } from "vitest";
import {
  LIVE_GAME_POSITION_SYNC_ERROR,
  requireLiveGamePositionSync,
} from "@/lib/live-game/challenge-position-sync";

describe("live-game challenge position sync", () => {
  it("allows challenge work after a successful position sync", async () => {
    await expect(requireLiveGamePositionSync(Promise.resolve(true))).resolves.toBeUndefined();
  });

  it("blocks challenge work when the position could not be verified", async () => {
    await expect(requireLiveGamePositionSync(Promise.resolve(false))).rejects.toThrow(
      LIVE_GAME_POSITION_SYNC_ERROR,
    );
  });

  it("keeps existing callers compatible when no sync is needed", async () => {
    await expect(requireLiveGamePositionSync(undefined)).resolves.toBeUndefined();
  });
});
