import { describe, expect, it } from "vitest";
import { applyMeterDeltas, clampMeter } from "@/lib/pet/care-actions";
import { decayAmountForElapsedMs, applyDecay } from "@/lib/pet/decay";
import { emptyPetSnapshot } from "@/lib/pet/defaults";

describe("clampMeter", () => {
  it("clamps to 0-100", () => {
    expect(clampMeter(150)).toBe(100);
    expect(clampMeter(-5)).toBe(0);
  });
});

describe("applyMeterDeltas", () => {
  it("applies feed deltas", () => {
    const base = emptyPetSnapshot(1000);
    base.meters.hunger = 50;
    const next = applyMeterDeltas(base, { hunger: 25 }, 2000);
    expect(next.meters.hunger).toBe(75);
    expect(next.lastUpdatedAt).toBe(2000);
  });
});

describe("decay", () => {
  it("decays 3 per hour capped at 15", () => {
    expect(decayAmountForElapsedMs(3_600_000)).toBe(3);
    expect(decayAmountForElapsedMs(6 * 3_600_000)).toBe(15);
    expect(decayAmountForElapsedMs(24 * 3_600_000)).toBe(15);
  });

  it("subtracts from all meters", () => {
    const base = emptyPetSnapshot(0);
    base.meters.hunger = 50;
    const next = applyDecay(base, 2 * 3_600_000);
    expect(next.meters.hunger).toBe(44);
    expect(next.meters.happiness).toBe(79);
  });
});
