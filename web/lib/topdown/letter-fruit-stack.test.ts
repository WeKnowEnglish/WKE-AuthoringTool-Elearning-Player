import { describe, expect, it } from "vitest";
import { defaultAtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import {
  applyLetterFruit3dLip,
  letterFruitStackHas3dLip,
} from "@/lib/topdown/letter-fruit-stack";

describe("letter-fruit-stack", () => {
  it("defaults flat stacks have no 3D lip", () => {
    const stack = defaultAtlasTileStackPreset(200, 300);
    const flat = applyLetterFruit3dLip(stack, 200, 300, false);
    expect(letterFruitStackHas3dLip(flat, 300)).toBe(false);
    expect(flat.lipStartY).toBe(300);
    expect(flat.layout.lipOverlapPx).toBe(0);
  });

  it("enables lip band and overlap when checked on", () => {
    const stack = applyLetterFruit3dLip(defaultAtlasTileStackPreset(200, 300), 200, 300, false);
    const withLip = applyLetterFruit3dLip(stack, 200, 300, true);
    expect(letterFruitStackHas3dLip(withLip, 300)).toBe(true);
    expect(withLip.layout.lipOverlapPx).toBeGreaterThan(0);
  });
});
