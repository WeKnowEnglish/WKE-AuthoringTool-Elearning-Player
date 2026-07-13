import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
  LIVE_GAME_SYSTEM_SET_UUIDS,
} from "@/lib/live-game/question-banks/question-set-ids";
import * as resolver from "@/lib/live-game/server/question-set-resolver";
import {
  HostQuestionSetInvalidError,
  readSessionQuestionSetBinding,
  resolveHostQuestionSetBinding,
} from "@/lib/live-game/server/question-set-session";

describe("live-game question set session binding", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reads uuid session binding", () => {
    const uuid = LIVE_GAME_SYSTEM_SET_UUIDS["grade56-adjectives"];
    const binding = readSessionQuestionSetBinding({
      questionSetId: uuid,
      questionSetVersion: 1,
    });
    expect(binding.setId).toBe(uuid);
    expect(binding.ref).toBe(uuid);
    expect(binding.version).toBe(1);
  });

  it("reads legacy slug session binding", () => {
    const binding = readSessionQuestionSetBinding({
      questionSetId: "school-life-a1",
      questionSetVersion: 1,
    });
    expect(binding.setId).toBe(LIVE_GAME_SYSTEM_SET_UUIDS["school-life-a1"]);
    expect(binding.ref).toBe("school-life-a1");
  });

  it("resolves host binding to canonical uuid", async () => {
    vi.spyOn(resolver, "getQuestionSetVersion").mockResolvedValue(1);
    const binding = await resolveHostQuestionSetBinding("daily-routines-a1");
    expect(binding.setId).toBe(LIVE_GAME_SYSTEM_SET_UUIDS["daily-routines-a1"]);
    expect(binding.ref).toBe(binding.setId);
    expect(binding.version).toBe(1);
  });

  it("rejects invalid host input", async () => {
    await expect(resolveHostQuestionSetBinding("not-a-real-set")).rejects.toBeInstanceOf(
      HostQuestionSetInvalidError,
    );
  });

  it("defaults empty host input to grade56-adjectives uuid", async () => {
    vi.spyOn(resolver, "getQuestionSetVersion").mockResolvedValue(1);
    const binding = await resolveHostQuestionSetBinding(undefined);
    expect(binding.setId).toBe(DEFAULT_LIVE_GAME_QUESTION_SET_UUID);
    expect(binding.ref).toBe(DEFAULT_LIVE_GAME_QUESTION_SET_UUID);
  });

  it("accepts uuid host input without falling back to default slug", async () => {
    vi.spyOn(resolver, "getQuestionSetVersion").mockResolvedValue(1);
    const uuid = LIVE_GAME_SYSTEM_SET_UUIDS["school-life-a1"];
    const binding = await resolveHostQuestionSetBinding(uuid);
    expect(binding.setId).toBe(uuid);
    expect(binding.ref).toBe(uuid);
  });
});
