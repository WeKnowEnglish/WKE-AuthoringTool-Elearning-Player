import { describe, expect, it } from "vitest";
import { getNormalizedStoryPages } from "@/lib/lesson-schemas";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import { VOCAB_LEARN_PAGE_BACKGROUND } from "./vocab-learn-new-word";
import {
  VOCAB_DRAG_LABEL_STICK_GAP,
  VOCAB_DRAG_PAGE_ID,
  buildDragMatchStoryPayload,
  layoutDragLabel,
  layoutDragLabelBelowTarget,
  layoutDragTarget,
} from "./vocab-drag-match";
import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import { buildVocabularyPracticeContext } from "./build-screens";

describe("vocab drag match layout", () => {
  const six = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
    seed: "drag-layout",
    practiceCount: 6,
  }).practiceWords;

  it("places pictures above the word bank", () => {
    for (let i = 0; i < six.length; i++) {
      const img = layoutDragTarget(i, six.length);
      const label = layoutDragLabel(i, six.length);
      expect(label.y).toBeGreaterThan(img.y + img.h);
    }
  });

  it("places matched labels just below the target image", () => {
    const img = layoutDragTarget(0, six.length);
    const label = layoutDragLabel(0, six.length);
    const stuck = layoutDragLabelBelowTarget(
      { x_percent: img.x, y_percent: img.y, w_percent: img.w, h_percent: img.h },
      { w_percent: label.w, h_percent: label.h },
    );
    expect(stuck.y).toBeCloseTo(img.y + img.h + VOCAB_DRAG_LABEL_STICK_GAP, 1);
    expect(stuck.x).toBeCloseTo(img.x + (img.w - label.w) / 2, 1);
    expect(stuck.w).toBe(label.w);
  });

  it("builds blue stage without card chrome", () => {
    const parsed = parseScreenPayload(
      "story",
      buildDragMatchStoryPayload(six),
    );
    expect(parsed?.type).toBe("story");
    if (parsed?.type !== "story") return;

    const page = getNormalizedStoryPages(parsed)[0]!;
    expect(page.id).toBe(VOCAB_DRAG_PAGE_ID);
    expect(page.background_color).toBe(VOCAB_LEARN_PAGE_BACKGROUND);

    const images = page.items.filter((it) => it.id.endsWith("-img"));
    const labels = page.items.filter((it) => it.id.endsWith("-txt"));
    expect(images.every((it) => it.show_card === false)).toBe(true);
    expect(labels.every((it) => it.show_card === true)).toBe(true);
    expect(images).toHaveLength(6);
    expect(labels).toHaveLength(6);

    for (const label of labels) {
      const paired = images.find((img) => img.id === label.id.replace(/-txt$/, "-img"));
      expect(paired).toBeDefined();
      expect(label.y_percent).toBeGreaterThan(
        (paired!.y_percent ?? 0) + (paired!.h_percent ?? 0),
      );
      expect(label.tap_speeches?.[0]?.text).toBeTruthy();
    }

    const playPhase = page.phases?.find((p) => p.id === "drag-play");
    expect(playPhase?.drag_match?.after_correct_match).toBe("stick_on_target");
  });
});
