import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLiveGameQuestionBundleCacheForTests,
  getNextPreloadedCraftQuestion,
  getNextPreloadedHarvestQuestion,
  preloadLiveGameQuestionBundle,
} from "@/lib/live-game/question-bundle-cache";
import type { LiveGameSafeQuestionBundle } from "@/lib/live-game/question-bundle";
import { pickQuestionFromSessionDeck } from "@/lib/live-game/question-deck";

const roomId = "wke-live-game-ABC123";
const playerId = "player-1";
const bundle: LiveGameSafeQuestionBundle = {
  roomId,
  questionSetId: "set-1",
  questionSetVersion: 3,
  harvest: [
    { id: "h-1", clientId: "harvest-1", prompt: "First?", options: ["A", "B", "C"] },
    { id: "h-2", clientId: "harvest-2", prompt: "Second?", options: ["D", "E", "F"] },
  ],
  deposit: [],
  craft: [
    { id: "c-1", clientId: "craft-1", prompt: "Build one", wordBank: ["I", "can", "build"], slotCount: 3 },
    { id: "c-2", clientId: "craft-2", prompt: "Build two", wordBank: ["We", "can", "help"], slotCount: 3 },
  ],
};

afterEach(() => {
  clearLiveGameQuestionBundleCacheForTests();
  vi.unstubAllGlobals();
});

describe("live-game question bundle cache", () => {
  it("selects the same upcoming harvest question as the authoritative session deck", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(bundle), { status: 200 })));
    await preloadLiveGameQuestionBundle(roomId);

    const cursor = 1;
    const expected = pickQuestionFromSessionDeck(bundle.harvest, {
      roomId,
      playerId,
      bank: "harvest",
      cursor,
    });
    const question = getNextPreloadedHarvestQuestion(roomId, playerId, cursor);

    expect(question?.id).toBe(expected.clientId);
    expect(question?.prompt).toBe(expected.prompt);
    expect(question?.options).toEqual(expect.arrayContaining(expected.options));
  });

  it("selects the same upcoming craft question as the authoritative session deck", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(bundle), { status: 200 })));
    await preloadLiveGameQuestionBundle(roomId);

    const cursor = 0;
    const expected = pickQuestionFromSessionDeck(bundle.craft, {
      roomId,
      playerId,
      bank: "craft",
      cursor,
    });
    const question = getNextPreloadedCraftQuestion(roomId, playerId, cursor);

    expect(question?.id).toBe(expected.clientId);
    expect(question?.prompt).toBe(expected.prompt);
    expect(question?.wordBank).toEqual(expect.arrayContaining(expected.wordBank));
  });
});
