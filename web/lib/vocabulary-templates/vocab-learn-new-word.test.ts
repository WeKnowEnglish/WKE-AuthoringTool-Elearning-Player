import { describe, expect, it } from "vitest";
import { getNormalizedStoryPages } from "@/lib/lesson-schemas";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import { buildVocabularySetScreens, wordsForLearnScreen } from "./build-screens";
import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import {
  VOCAB_LEARN_BTN_ID,
  VOCAB_LEARN_PLAY_PHASE_ID,
  getVocabLearnImageItems,
  isVocabLearnSlotItemId,
  layoutLearnBorderSlot,
  learnBorderSlotClearsCenterVoid,
} from "./vocab-learn-new-word";

describe("vocab learn new-word payload", () => {
  it("builds silhouette slot images, hidden spotlight images, and New word button", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed: "learn-test" });
    const learn = screens.find((s) => s.order_index === 1);
    const parsed = parseScreenPayload("story", learn?.payload);
    expect(parsed?.type).toBe("story");
    if (parsed?.type !== "story") return;

    const page = getNormalizedStoryPages(parsed)[0]!;
    const slots = page.items.filter((it) => isVocabLearnSlotItemId(it.id));
    const images = getVocabLearnImageItems(page.items);
    const button = page.items.find((it) => it.id === VOCAB_LEARN_BTN_ID);
    const learnWords = wordsForLearnScreen(A1_BREAKFAST_FOOD);

    expect(learnWords).toHaveLength(12);
    expect(slots).toHaveLength(12);
    expect(images).toHaveLength(12);
    expect(button?.kind).toBe("button");
    expect(button?.text).toBe("New word");

    for (const img of images) {
      expect(img.show_on_start).toBe(false);
      expect(img.show_card).toBe(false);
    }
    for (const slot of slots) {
      expect(slot.image_url).toBeTruthy();
      expect(slot.show_card).toBe(false);
      expect(slot.show_on_start).toBe(true);
      expect(
        learnBorderSlotClearsCenterVoid({
          x: slot.x_percent,
          y: slot.y_percent,
          w: slot.w_percent,
          h: slot.h_percent,
        }),
      ).toBe(true);
    }

    const builtRects = slots.map((s) => ({
      x: s.x_percent,
      y: s.y_percent,
    }));
    const expectedRects = Array.from({ length: learnWords.length }, (_, i) =>
      layoutLearnBorderSlot(i, learnWords.length),
    );
    for (let i = 0; i < learnWords.length; i++) {
      expect(builtRects[i]?.x).toBeCloseTo(expectedRects[i]!.x, 1);
      expect(builtRects[i]?.y).toBeCloseTo(expectedRects[i]!.y, 1);
    }

    const playPhase = page.phases?.find((p) => p.id === VOCAB_LEARN_PLAY_PHASE_ID);
    expect(playPhase?.completion?.type).not.toBe("pool_interaction_quota");
    expect(playPhase?.visible_item_ids).toContain(VOCAB_LEARN_BTN_ID);
  });
});
