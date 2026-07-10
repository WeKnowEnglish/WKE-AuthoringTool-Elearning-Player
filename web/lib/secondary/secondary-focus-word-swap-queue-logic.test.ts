import { describe, expect, it } from "vitest";
import {
  mergeSwapQueue,
  popSwapQueue,
  shouldOpenSwapModal,
  swapQueueItemKey,
} from "@/lib/secondary/secondary-focus-word-swap-queue-logic";

const swapA = { outWordItemId: "w1", inWordItemId: "w9" };
const swapB = { outWordItemId: "w2", inWordItemId: "w8" };

describe("secondary-focus-word-swap-queue-logic", () => {
  it("builds stable queue item keys", () => {
    expect(swapQueueItemKey(swapA)).toBe("w1:w9");
  });

  it("merges incoming swaps without duplicates", () => {
    expect(mergeSwapQueue([swapA], [swapA, swapB])).toEqual([swapA, swapB]);
    expect(mergeSwapQueue([swapA, swapB], [swapB])).toEqual([swapA, swapB]);
  });

  it("pops the queue head", () => {
    expect(popSwapQueue([swapA, swapB])).toEqual({ head: swapA, rest: [swapB] });
    expect(popSwapQueue([])).toEqual({ head: null, rest: [] });
  });

  it("opens swap modal only when intro is closed and queue has items", () => {
    expect(shouldOpenSwapModal(true, 2)).toBe(false);
    expect(shouldOpenSwapModal(false, 0)).toBe(false);
    expect(shouldOpenSwapModal(false, 1)).toBe(true);
  });
});
