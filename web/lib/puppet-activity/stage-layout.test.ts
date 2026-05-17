import { describe, expect, it } from "vitest";
import {
  clampStageLayout,
  DEFAULT_PUPPET_STAGE_LAYOUT,
  stageLayoutTransform,
} from "./stage-layout";

describe("stage-layout", () => {
  it("clamps scale and offsets", () => {
    expect(
      clampStageLayout({ scale: 3, offsetX: 500, offsetY: -500 }),
    ).toEqual({ scale: 2, offsetX: 160, offsetY: -160 });
  });

  it("builds transform with translate then scale", () => {
    expect(
      stageLayoutTransform({ scale: 1.5, offsetX: 10, offsetY: -20 }),
    ).toBe("translate(10px, -20px) scale(1.5)");
  });

  it("default layout is identity", () => {
    expect(stageLayoutTransform(DEFAULT_PUPPET_STAGE_LAYOUT)).toBe(
      "translate(0px, 0px) scale(1)",
    );
  });
});
