import { describe, expect, it } from "vitest";
import {
  collectTakenLiveGameAvatarIds,
  pickFirstAvailableLiveGameAvatarId,
  resolveLiveGameAvatarForJoin,
} from "@/lib/live-game/characters/avatar-availability";

describe("live game avatar availability", () => {
  it("collects taken avatars excluding one player", () => {
    const taken = collectTakenLiveGameAvatarIds(
      [
        { id: "a", avatarId: "boy-1" },
        { id: "b", avatarId: "girl-2" },
      ],
      "a",
    );
    expect(taken.has("boy-1")).toBe(false);
    expect(taken.has("girl-2")).toBe(true);
  });

  it("picks the first free character", () => {
    const taken = collectTakenLiveGameAvatarIds([{ id: "a", avatarId: "boy-1" }]);
    expect(pickFirstAvailableLiveGameAvatarId(taken)).toBe("boy-2");
  });

  it("resolves join avatar to first available when requested is taken", () => {
    const taken = collectTakenLiveGameAvatarIds([{ id: "host", avatarId: "boy-1" }]);
    expect(resolveLiveGameAvatarForJoin("boy-1", taken)).toBe("boy-2");
    expect(resolveLiveGameAvatarForJoin("girl-3", taken)).toBe("girl-3");
  });
});
