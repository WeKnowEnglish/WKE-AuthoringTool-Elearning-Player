import { describe, expect, it } from "vitest";
import { buildCardsFromPairs } from "@/lib/memory/memory-cards";
import { pickPairsForRun, MEMORY_DECKS } from "@/lib/memory/memory-pairs";
import {
  createMemorySession,
  flipCard,
  isSessionComplete,
  resolveTurn,
  runPetTurn,
  computeMemoryGoldBonus,
} from "@/lib/memory/memory-session";

describe("memory session", () => {
  it("creates 8 cards from 4 pairs", () => {
    const s = createMemorySession(() => 0.5);
    expect(s.cards).toHaveLength(8);
    expect(s.states.every((st) => st === "down")).toBe(true);
    expect(s.pairsRemaining).toBe(4);
  });

  it("matches word and picture of same pairId", () => {
    const pairs = pickPairsForRun(MEMORY_DECKS[0]!, 4, () => 0.1);
    const cards = buildCardsFromPairs(pairs, () => 0.5);
    const wordIdx = cards.findIndex((c) => c.pairId === pairs[0]!.pairId && c.face === "word");
    const picIdx = cards.findIndex((c) => c.pairId === pairs[0]!.pairId && c.face === "picture");

    let session = createMemorySession(() => 0.5);
    session = {
      ...session,
      cards,
      states: cards.map(() => "down" as const),
      activeSide: "player",
      pairsRemaining: 4,
    };

    const r1 = flipCard(session, wordIdx);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = flipCard(r1.session, picIdx);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    const resolved = resolveTurn(r2.session);
    expect(resolved.matched).toBe(true);
    expect(resolved.session.pairsRemaining).toBe(3);
    expect(resolved.session.playerMatches).toBe(1);
    expect(resolved.keepTurn).toBe(true);
  });

  it("miss switches active side", () => {
    let session = createMemorySession(() => 0.5);
    session = { ...session, activeSide: "player" };
    const a = 0;
    const b = session.cards.findIndex(
      (c, i) => i !== a && c.pairId !== session.cards[a]!.pairId,
    );
    expect(b).toBeGreaterThan(-1);

    const r1 = flipCard(session, a);
    const r2 = flipCard(r1.ok ? r1.session : session, b);
    if (!r1.ok || !r2.ok) return;

    const resolved = resolveTurn(r2.session);
    expect(resolved.matched).toBe(false);
    expect(resolved.session.activeSide).toBe("pet");
    expect(resolved.session.states[a]).toBe("down");
    expect(resolved.session.states[b]).toBe("down");
  });

  it("pet turn flips two cards and updates session", () => {
    const s = createMemorySession(() => 0.3);
    const petFirst = { ...s, activeSide: "pet" as const };
    const { session, completed } = runPetTurn(petFirst, () => 0.42);
    const progressed =
      completed ||
      session.pairsRemaining < s.pairsRemaining ||
      session.activeSide !== petFirst.activeSide;
    const flipped = session.states.some((st) => st === "matched" || st === "down");
    expect(progressed || session.petMemory.length >= 2).toBe(true);
    expect(flipped).toBe(true);
  });

  it("computeMemoryGoldBonus scales with player matches", () => {
    expect(computeMemoryGoldBonus(0)).toBe(3);
    expect(computeMemoryGoldBonus(4)).toBe(11);
    expect(computeMemoryGoldBonus(10)).toBe(15);
  });

  it("is complete when no pairs remain", () => {
    const s = createMemorySession(() => 0.5);
    expect(isSessionComplete({ ...s, pairsRemaining: 0 })).toBe(true);
  });
});
