import type { MemorySession } from "@/lib/memory/memory-session";

function flipableIndices(session: MemorySession): number[] {
  const out: number[] = [];
  for (let i = 0; i < session.states.length; i++) {
    if (session.states[i] === "down") out.push(i);
  }
  return out;
}

function findKnownMatch(session: MemorySession): [number, number] | null {
  const down = flipableIndices(session);
  const byPair = new Map<string, number[]>();

  for (const mem of session.petMemory) {
    if (!down.includes(mem.index)) continue;
    const list = byPair.get(mem.pairId) ?? [];
    list.push(mem.index);
    byPair.set(mem.pairId, list);
  }

  for (const [, indices] of byPair) {
    const wordIdx = indices.find((i) => session.cards[i]!.face === "word");
    const picIdx = indices.find((i) => session.cards[i]!.face === "picture");
    if (wordIdx != null && picIdx != null) return [wordIdx, picIdx];
  }

  return null;
}

function pickRandomIndex(indices: number[], random: () => number): number {
  return indices[Math.floor(random() * indices.length)]!;
}

/**
 * Returns two board indices for the pet to flip this turn.
 */
export function pickPetFlipIndices(
  session: MemorySession,
  random: () => number = Math.random,
): [number, number] | null {
  const down = flipableIndices(session);
  if (down.length < 2) return null;

  const known = findKnownMatch(session);
  if (known && down.includes(known[0]) && down.includes(known[1])) {
    return known;
  }

  const first = pickRandomIndex(down, random);
  const firstCard = session.cards[first]!;

  const seenPartner = session.petMemory.find(
    (m) =>
      m.pairId === firstCard.pairId &&
      m.face !== firstCard.face &&
      down.includes(m.index),
  );

  if (seenPartner) {
    return [first, seenPartner.index];
  }

  const partner = down.find(
    (i) =>
      i !== first &&
      session.cards[i]!.pairId === firstCard.pairId &&
      session.cards[i]!.face !== firstCard.face,
  );

  if (partner != null && random() < 0.35) {
    return [first, partner];
  }

  const rest = down.filter((i) => i !== first);
  const second = pickRandomIndex(rest, random);
  return [first, second];
}
