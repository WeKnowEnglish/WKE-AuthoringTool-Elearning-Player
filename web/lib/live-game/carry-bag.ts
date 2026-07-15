import type {
  LiveGameCarrySlot,
  LiveGameCraftGateSnapshot,
  LiveGamePlayerCarry,
  LiveGamePlayerInventory,
  LiveGameResourceType,
  LiveGameStorageSnapshot,
} from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_CARRY_CAPACITY_BACKPACK,
  ENGLISH_CRAFT_CARRY_CAPACITY_BASE,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { readPlayerInventory } from "@/lib/live-game/server/read-player-inventory";

export type LiveGameHeldVisual = LiveGameResourceType | "bread";

/** Legacy single-item carry stored before multi-slot bags. */
type LegacyPlayerCarry = {
  resourceType: LiveGameResourceType;
  sourceNodeId: string;
  questionId: string;
  harvestedAt: number;
};

function isLegacyCarry(value: unknown): value is LegacyPlayerCarry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.resourceType === "string" &&
    typeof record.sourceNodeId === "string" &&
    typeof record.questionId === "string" &&
    typeof record.harvestedAt === "number" &&
    !("slots" in record)
  );
}

function emptySlots(capacity: number): Array<LiveGameCarrySlot | null> {
  return Array.from({ length: capacity }, () => null);
}

export function carryCapacityForInventory(inventory: LiveGamePlayerInventory): number {
  return inventory.backpack ?
      ENGLISH_CRAFT_CARRY_CAPACITY_BACKPACK
    : ENGLISH_CRAFT_CARRY_CAPACITY_BASE;
}

export function carryCapacityForPlayer(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): number {
  return carryCapacityForInventory(readPlayerInventory(storage, playerId));
}

export function createEmptyCarryBag(capacity: number): LiveGamePlayerCarry {
  return {
    slots: emptySlots(Math.max(1, capacity)),
    heldSlotIndex: 0,
  };
}

export function normalizePlayerCarry(
  raw: unknown,
  capacity = ENGLISH_CRAFT_CARRY_CAPACITY_BASE,
): LiveGamePlayerCarry | null {
  if (!raw || typeof raw !== "object") return null;

  if (isLegacyCarry(raw)) {
    const bag = createEmptyCarryBag(capacity);
    bag.slots[0] = {
      kind: "resource",
      resourceType: raw.resourceType,
      sourceNodeId: raw.sourceNodeId,
      questionId: raw.questionId,
      harvestedAt: raw.harvestedAt,
    };
    bag.heldSlotIndex = 0;
    return bag;
  }

  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.slots)) return null;

  const slots = emptySlots(capacity);
  for (let i = 0; i < Math.min(capacity, record.slots.length); i += 1) {
    const slot = normalizeCarrySlot(record.slots[i]);
    if (slot) slots[i] = slot;
  }

  const filledIndexes = slots
    .map((slot, index) => (slot ? index : -1))
    .filter((index) => index >= 0);
  if (filledIndexes.length === 0) return null;

  let heldSlotIndex =
    typeof record.heldSlotIndex === "number" && Number.isInteger(record.heldSlotIndex) ?
      record.heldSlotIndex
    : filledIndexes[0]!;
  if (heldSlotIndex < 0 || heldSlotIndex >= capacity || !slots[heldSlotIndex]) {
    heldSlotIndex = filledIndexes[0]!;
  }

  return { slots, heldSlotIndex };
}

export function normalizeCarrySlot(value: unknown): LiveGameCarrySlot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "bread" && typeof record.craftedAt === "number") {
    return { kind: "bread", craftedAt: record.craftedAt };
  }
  if (
    record.kind === "resource" &&
    typeof record.resourceType === "string" &&
    typeof record.sourceNodeId === "string" &&
    typeof record.questionId === "string" &&
    typeof record.harvestedAt === "number"
  ) {
    return {
      kind: "resource",
      resourceType: record.resourceType as LiveGameResourceType,
      sourceNodeId: record.sourceNodeId,
      questionId: record.questionId,
      harvestedAt: record.harvestedAt,
    };
  }
  // Legacy slot without kind discriminator.
  if (
    typeof record.resourceType === "string" &&
    typeof record.sourceNodeId === "string" &&
    typeof record.questionId === "string" &&
    typeof record.harvestedAt === "number"
  ) {
    return {
      kind: "resource",
      resourceType: record.resourceType as LiveGameResourceType,
      sourceNodeId: record.sourceNodeId,
      questionId: record.questionId,
      harvestedAt: record.harvestedAt,
    };
  }
  return null;
}

export function readPlayerCarryBag(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): LiveGamePlayerCarry | null {
  const capacity = carryCapacityForPlayer(storage, playerId);
  return normalizePlayerCarry(storage?.playerCarry?.[playerId], capacity);
}

export function getHeldSlot(bag: LiveGamePlayerCarry | null | undefined): LiveGameCarrySlot | null {
  if (!bag) return null;
  return bag.slots[bag.heldSlotIndex] ?? null;
}

export function getHeldVisual(bag: LiveGamePlayerCarry | null | undefined): LiveGameHeldVisual | null {
  const held = getHeldSlot(bag);
  if (!held) return null;
  return held.kind === "bread" ? "bread" : held.resourceType;
}

export function isHoldingBread(bag: LiveGamePlayerCarry | null | undefined): boolean {
  return getHeldSlot(bag)?.kind === "bread";
}

export function countFilledSlots(bag: LiveGamePlayerCarry | null | undefined): number {
  if (!bag) return 0;
  return bag.slots.reduce((count, slot) => count + (slot ? 1 : 0), 0);
}

export function hasFreeCarrySlot(bag: LiveGamePlayerCarry | null | undefined, capacity: number): boolean {
  if (!bag) return capacity > 0;
  return bag.slots.some((slot) => slot == null) || bag.slots.length < capacity;
}

export function findFreeCarrySlotIndex(bag: LiveGamePlayerCarry, capacity: number): number {
  const slots = ensureSlotCapacity(bag, capacity).slots;
  return slots.findIndex((slot) => slot == null);
}

export function ensureSlotCapacity(bag: LiveGamePlayerCarry, capacity: number): LiveGamePlayerCarry {
  if (bag.slots.length === capacity) return bag;
  const slots = emptySlots(capacity);
  for (let i = 0; i < Math.min(capacity, bag.slots.length); i += 1) {
    slots[i] = bag.slots[i] ?? null;
  }
  let heldSlotIndex = bag.heldSlotIndex;
  if (heldSlotIndex >= capacity || !slots[heldSlotIndex]) {
    heldSlotIndex = slots.findIndex((slot) => slot != null);
    if (heldSlotIndex < 0) heldSlotIndex = 0;
  }
  return { slots, heldSlotIndex };
}

export function appendCarrySlot(
  bag: LiveGamePlayerCarry | null,
  slot: LiveGameCarrySlot,
  capacity: number,
): LiveGamePlayerCarry | null {
  const next = ensureSlotCapacity(bag ?? createEmptyCarryBag(capacity), capacity);
  const freeIndex = next.slots.findIndex((entry) => entry == null);
  if (freeIndex < 0) return null;
  const previouslyEmpty = countFilledSlots(next) === 0;
  const slots = [...next.slots];
  slots[freeIndex] = slot;
  return {
    slots,
    heldSlotIndex:
      previouslyEmpty || !next.slots[next.heldSlotIndex] ? freeIndex : next.heldSlotIndex,
  };
}

export function setHeldSlotIndex(
  bag: LiveGamePlayerCarry,
  heldSlotIndex: number,
): LiveGamePlayerCarry | null {
  if (heldSlotIndex < 0 || heldSlotIndex >= bag.slots.length) return null;
  if (!bag.slots[heldSlotIndex]) return null;
  return { ...bag, heldSlotIndex };
}

export function removeHeldSlot(bag: LiveGamePlayerCarry): LiveGamePlayerCarry | null {
  const slots = [...bag.slots];
  slots[bag.heldSlotIndex] = null;
  const nextFilled = slots.findIndex((slot) => slot != null);
  if (nextFilled < 0) return null;
  return { slots, heldSlotIndex: nextFilled };
}

export function removeMatchingResourceSlots(
  bag: LiveGamePlayerCarry,
  resourceType: LiveGameResourceType,
): { bag: LiveGamePlayerCarry | null; removedCount: number } {
  let removedCount = 0;
  const slots = bag.slots.map((slot) => {
    if (slot?.kind === "resource" && slot.resourceType === resourceType) {
      removedCount += 1;
      return null;
    }
    return slot;
  });
  if (removedCount === 0) return { bag, removedCount: 0 };
  const nextFilled = slots.findIndex((slot) => slot != null);
  if (nextFilled < 0) return { bag: null, removedCount };
  const previouslyHeld = bag.slots[bag.heldSlotIndex];
  const heldSlotIndex =
    previouslyHeld?.kind === "resource" && previouslyHeld.resourceType === resourceType ?
      nextFilled
    : slots[bag.heldSlotIndex] ? bag.heldSlotIndex
    : nextFilled;
  return { bag: { slots, heldSlotIndex }, removedCount };
}

export function countMatchingResourceSlots(
  bag: LiveGamePlayerCarry | null | undefined,
  resourceType: LiveGameResourceType,
): number {
  if (!bag) return 0;
  return bag.slots.reduce((count, slot) => {
    if (slot?.kind === "resource" && slot.resourceType === resourceType) return count + 1;
    return count;
  }, 0);
}

export function bagHasMatchingResource(
  bag: LiveGamePlayerCarry | null | undefined,
  resourceType: LiveGameResourceType,
): boolean {
  return countMatchingResourceSlots(bag, resourceType) > 0;
}

/** Prefer a matching resource for deposit targeting; otherwise use held visual resource. */
export function depositResourceTypeFromBag(
  bag: LiveGamePlayerCarry | null | undefined,
): LiveGameResourceType | null {
  const held = getHeldSlot(bag);
  if (held?.kind === "resource") return held.resourceType;
  if (!bag) return null;
  for (const slot of bag.slots) {
    if (slot?.kind === "resource") return slot.resourceType;
  }
  return null;
}

export function playerHasAnyCarry(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): boolean {
  return countFilledSlots(readPlayerCarryBag(storage, playerId)) > 0;
}

export function playerCarryIsFull(
  storage:
    | LiveGameStorageSnapshot
    | LiveGameCraftGateSnapshot
    | null
    | undefined,
  playerId: string,
): boolean {
  const capacity = carryCapacityForPlayer(storage as LiveGameStorageSnapshot, playerId);
  const bag = readPlayerCarryBag(storage as LiveGameStorageSnapshot, playerId);
  return !hasFreeCarrySlot(bag, capacity);
}
