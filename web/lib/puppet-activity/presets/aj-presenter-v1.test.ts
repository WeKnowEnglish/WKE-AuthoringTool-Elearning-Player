import { describe, expect, it } from "vitest";
import { AJ_PRESENTER_V1 } from "./aj-presenter-v1";
import { rigPresetToEditorState } from "./index";

describe("aj-presenter-v1", () => {
  it("uses body bob idle without rotate", () => {
    expect(AJ_PRESENTER_V1.partMotion.body.rotateEnabled).toBe(false);
    expect(AJ_PRESENTER_V1.partMotion.body.translateEnabled).toBe(true);
    expect(AJ_PRESENTER_V1.partMotion.body.translateMaxPx).toBe(4);
  });

  it("converts to editor state with skeleton tree", () => {
    const state = rigPresetToEditorState(AJ_PRESENTER_V1);
    expect(state.skeletonParents.head).toBe("body");
    expect(state.skeletonParents.body).toBe(null);
  });
});
