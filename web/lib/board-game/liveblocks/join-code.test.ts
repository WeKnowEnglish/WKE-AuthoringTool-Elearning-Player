import { describe, expect, it } from "vitest";
import {
  generateJoinCode,
  isValidJoinCode,
  JOIN_CODE_LENGTH,
} from "@/lib/board-game/liveblocks/join-code";

describe("join-code", () => {
  it("generates a 6-character code", () => {
    const code = generateJoinCode(() => 0);
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    expect(isValidJoinCode(code)).toBe(true);
  });

  it("rejects invalid lengths and characters", () => {
    expect(isValidJoinCode("ABC")).toBe(false);
    expect(isValidJoinCode("ABCDEFG")).toBe(false);
    expect(isValidJoinCode("ABC10Z")).toBe(false);
    expect(isValidJoinCode("ABCDEF")).toBe(true);
  });
});
