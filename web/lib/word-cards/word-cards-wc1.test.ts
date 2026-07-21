import { describe, expect, it } from "vitest";
import {
  getVcActivity,
  isRegisteredVcActivity,
  listEnabledVcActivities,
  studentEntryPathForActivity,
  toWordCardsRoomId,
  parseWordCardsRoomId,
} from "@/lib/activity-runtime";
import { getRoomProduct } from "@/lib/liveblocks/room-prefix";
import {
  assignWordsRoundRobin,
  cardIdForStudent,
  createWordCardsRoundId,
  parseWordList,
} from "@/lib/word-cards/domain";

describe("word cards WC-1 foundation", () => {
  it("registers word_cards as an enabled VC activity", () => {
    expect(isRegisteredVcActivity("word_cards")).toBe(true);
    expect(listEnabledVcActivities().map((a) => a.kind)).toContain("word_cards");
    expect(getVcActivity("word_cards")?.interaction.pushToStudent).toBe(true);
  });

  it("routes student entry and Liveblocks room ids by join code", () => {
    expect(
      studentEntryPathForActivity({
        kind: "word_cards",
        joinCode: "ABC123",
        label: "Word cards",
        roundId: "wcrd_1",
        roomId: toWordCardsRoomId("ABC123"),
      }),
    ).toBe("/word-cards/ABC123");
    expect(toWordCardsRoomId("abc123")).toBe("wke-word-cards-ABC123");
    expect(parseWordCardsRoomId("wke-word-cards-XYZ789")).toEqual({ joinCode: "XYZ789" });
    expect(getRoomProduct("wke-word-cards-ABC123")).toBe("word-cards");
  });

  it("parses word lists and assigns round-robin with recycle", () => {
    expect(parseWordList("apple, banana\nchair; desk")).toEqual([
      "apple",
      "banana",
      "chair",
      "desk",
    ]);
    expect(parseWordList("apple\napple\nBanana")).toEqual(["apple", "Banana"]);

    const assigned = assignWordsRoundRobin({
      wordList: ["a", "b"],
      studentIds: ["u1", "u2", "u3"],
    });
    expect(assigned).toEqual({ u1: "a", u2: "b", u3: "a" });
    expect(cardIdForStudent("u1")).toBe("card:student:u1");
    expect(createWordCardsRoundId(1).startsWith("wcrd_")).toBe(true);
  });
});
