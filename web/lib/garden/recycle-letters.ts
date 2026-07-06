import { LETTERS_PER_RECYCLED_SEED, newGardenId } from "@/lib/garden/defaults";
import { setGardenSnapshot } from "@/lib/garden/storage";
import type { GardenSeed, GardenSnapshotV1, LetterInventory } from "@/lib/garden/types";

export type RecycleLettersResult =
  | {
      ok: true;
      snapshot: GardenSnapshotV1;
      lettersConsumed: number;
      seedsGranted: number;
      consumed: LetterInventory;
    }
  | {
      ok: false;
      reason: "not_enough_letters" | "invalid_selection" | "nothing_to_recycle";
    };

function totalSelected(selection: LetterInventory): number {
  return Object.values(selection).reduce((sum, n) => sum + n, 0);
}

function normalizeSelection(selection: LetterInventory): LetterInventory {
  const next: LetterInventory = {};
  for (const [ch, count] of Object.entries(selection)) {
    const upper = ch.toUpperCase();
    if (upper < "A" || upper > "Z") continue;
    const n = Math.floor(count);
    if (n > 0) next[upper] = n;
  }
  return next;
}

export function selectionToLetterList(selection: LetterInventory): string[] {
  const list: string[] = [];
  for (const ch of Object.keys(selection).sort()) {
    const count = selection[ch] ?? 0;
    for (let i = 0; i < count; i++) {
      list.push(ch);
    }
  }
  return list;
}

export function subtractConsumedFromSelection(
  selection: LetterInventory,
  consumed: LetterInventory,
): LetterInventory {
  const next: LetterInventory = {};
  for (const [ch, count] of Object.entries(selection)) {
    const remaining = count - (consumed[ch] ?? 0);
    if (remaining > 0) next[ch] = remaining;
  }
  return next;
}

function consumeLetterList(
  letters: LetterInventory,
  toRemove: string[],
): LetterInventory {
  const next: LetterInventory = { ...letters };
  for (const ch of toRemove) {
    const upper = ch.toUpperCase();
    const count = next[upper] ?? 0;
    if (count <= 1) delete next[upper];
    else next[upper] = count - 1;
  }
  return next;
}

function letterInventoryFromList(letters: string[]): LetterInventory {
  const counts: LetterInventory = {};
  for (const ch of letters) {
    const upper = ch.toUpperCase();
    counts[upper] = (counts[upper] ?? 0) + 1;
  }
  return counts;
}

export function recycleLetters(
  snapshot: GardenSnapshotV1,
  selection: LetterInventory,
  now = Date.now(),
): RecycleLettersResult {
  const normalized = normalizeSelection(selection);
  const selectedTotal = totalSelected(normalized);

  if (selectedTotal === 0) {
    return { ok: false, reason: "nothing_to_recycle" };
  }
  if (selectedTotal < LETTERS_PER_RECYCLED_SEED) {
    return { ok: false, reason: "not_enough_letters" };
  }

  for (const [ch, count] of Object.entries(normalized)) {
    if ((snapshot.letters[ch] ?? 0) < count) {
      return { ok: false, reason: "invalid_selection" };
    }
  }

  const selectedList = selectionToLetterList(normalized);
  const lettersConsumed =
    Math.floor(selectedList.length / LETTERS_PER_RECYCLED_SEED) *
    LETTERS_PER_RECYCLED_SEED;
  const seedsGranted = lettersConsumed / LETTERS_PER_RECYCLED_SEED;
  const toRemove = selectedList.slice(0, lettersConsumed);
  const consumed = letterInventoryFromList(toRemove);

  const newSeeds: GardenSeed[] = [];
  for (let i = 0; i < seedsGranted; i++) {
    newSeeds.push({
      id: newGardenId(),
      tier: "common",
      grantedAt: now,
      sourceEventId: `recycle:${newGardenId()}`,
    });
  }

  const nextSnapshot = setGardenSnapshot({
    ...snapshot,
    letters: consumeLetterList(snapshot.letters, toRemove),
    seedPouch: [...snapshot.seedPouch, ...newSeeds],
    lastUpdatedAt: now,
  });

  return {
    ok: true,
    snapshot: nextSnapshot,
    lettersConsumed,
    seedsGranted,
    consumed,
  };
}
