import { describe, expect, it } from "vitest";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import { getNormalizedStoryPages } from "@/lib/lesson-schemas";
import {
  buildVocabularyPracticeContext,
  buildVocabularySetScreens,
  practiceWordsInSessionOrder,
} from "./build-screens";
import { hasBrokenThisIsPattern, thisLemmaStatement } from "./lemma-statement";
import { isClozeDerivedSentence, isPictureDescriptionStatement } from "./vocab-tf-statements";
import { getVocabularySet, VOCAB_SET_MENU } from "./registry";
import { expectedVocabularyScreenCount, validateVocabularySetDefinition } from "./validate";
import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";

describe("vocabulary-templates registry", () => {
  it("exposes breakfast and animal sets in the menu", () => {
    expect(VOCAB_SET_MENU.map((e) => e.id)).toEqual([
      "breakfast_food",
      "wild_animals",
      "pets",
      "sea_animals",
      "farm_animals",
    ]);
  });

  it("loads a valid breakfast set definition", () => {
    const def = getVocabularySet("breakfast_food");
    expect(validateVocabularySetDefinition(def)).toEqual([]);
    expect(def.words).toHaveLength(15);
    expect(def.words.map((w) => w.id)).toContain("pancakes");
    expect(def.words.find((w) => w.id === "orange")?.lemma).toBe("orange");
  });
});

describe("practiceWordsInSessionOrder", () => {
  it("shuffles practice order separately from pick order", () => {
    const ctx = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
      seed: "order-test-seed",
      practiceCount: 6,
    });
    const ordered = practiceWordsInSessionOrder(ctx);
    expect(ordered).toHaveLength(6);
    expect(ordered.map((w) => w.id)).not.toEqual(ctx.practiceWords.map((w) => w.id));
  });

  it("is stable for the same seed", () => {
    const ctx = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
      seed: "order-stable",
      practiceCount: 6,
    });
    const a = practiceWordsInSessionOrder(ctx).map((w) => w.id);
    const b = practiceWordsInSessionOrder(ctx).map((w) => w.id);
    expect(a).toEqual(b);
  });
});

describe("buildVocabularyPracticeContext", () => {
  it("picks six practice words deterministically", () => {
    const a = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
      seed: "test-seed",
      practiceCount: 6,
    });
    const b = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
      seed: "test-seed",
      practiceCount: 6,
    });
    expect(a.practiceWords).toHaveLength(6);
    expect(a.practiceWords.map((w) => w.id)).toEqual(b.practiceWords.map((w) => w.id));
  });
});

describe("buildVocabularySetScreens", () => {
  const seed = "fixed-test-seed";

  it("returns screens that all parse", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    expect(screens.length).toBe(expectedVocabularyScreenCount(6));
    for (const s of screens) {
      const parsed = parseScreenPayload(s.screen_type, s.payload);
      expect(parsed, `screen ${s.order_index} (${s.screen_type})`).not.toBeNull();
    }
  });

  it("starts with topic opening and ends on spell practice", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed });
    expect(screens[0]?.screen_type).toBe("start");
    const open = parseScreenPayload("start", screens[0]?.payload);
    const last = parseScreenPayload(
      screens[screens.length - 1]?.screen_type ?? "interaction",
      screens[screens.length - 1]?.payload,
    );
    expect(open?.type).toBe("start");
    if (open?.type === "start") {
      expect(open.cta_label).toBe("Start learning");
      expect(open.read_aloud_title).toBe("Breakfast Food");
      expect(open.image_fit).toBe("cover");
      expect(open.image_url).toContain("supabase.co");
    }
    expect(last?.type).toBe("interaction");
    if (last?.type === "interaction") {
      expect(last.subtype).toBe("letter_mixup");
    }
  });

  it("includes a single-page learn grid with New word flow", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed });
    const learn = screens.find((s) => s.order_index === 1);
    expect(learn?.screen_type).toBe("story");
    const parsed = parseScreenPayload("story", learn?.payload);
    expect(parsed?.type).toBe("story");
    if (parsed?.type === "story") {
      const pages = getNormalizedStoryPages(parsed);
      expect(pages).toHaveLength(1);
      const page = pages[0];
      expect(page?.background_color).toBe("#dbeafe");
      expect(page?.items.filter((it) => it.id.endsWith("-img"))).toHaveLength(12);
      expect(page?.items.filter((it) => it.id.endsWith("-slot"))).toHaveLength(12);
      const learnIds = page?.items
        .filter((it) => it.id.endsWith("-img"))
        .map((it) => it.id.replace(/^learn-|-img$/g, ""));
      expect(learnIds).not.toEqual(expect.arrayContaining(["water", "coffee", "tea"]));
      const playPhase = page?.phases?.find((p) => p.id === "learn-play");
      expect(playPhase?.completion?.type).not.toBe("pool_interaction_quota");
    }
  });

  it("builds six true_false screens for practice words", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    const tf = screens.filter((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return p?.type === "interaction" && p.subtype === "true_false";
    });
    expect(tf).toHaveLength(6);
    for (const row of tf) {
      const p = parseScreenPayload(row.screen_type, row.payload);
      if (p?.type === "interaction" && p.subtype === "true_false") {
        expect(p.quiz_group_id).toBe("vocab-tf-word");
        expect(p.quiz_group_title).toBe("Is this sentence true?");
        expect(p.thumb_cue).toBeUndefined();
        expect(p.picture_truth_statement?.length).toBeGreaterThan(0);
        expect(p.statement).toMatch(/^(This is|These are) /);
      }
    }
  });

  it("includes drag match story with learn-blue stage and separated word bank", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    const drag = screens.find((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return p?.type === "story" && getNormalizedStoryPages(p).some((pg) => pg.id === "drag-match");
    });
    const parsed = parseScreenPayload("story", drag?.payload);
    expect(parsed?.type).toBe("story");
    if (parsed?.type !== "story") return;
    const page = getNormalizedStoryPages(parsed).find((pg) => pg.id === "drag-match");
    expect(page?.background_color).toBe("#dbeafe");
    const imgs = page?.items.filter((it) => it.id.endsWith("-img")) ?? [];
    const txts = page?.items.filter((it) => it.id.endsWith("-txt")) ?? [];
    expect(imgs.length).toBe(6);
    expect(txts.length).toBe(6);
    for (const txt of txts) {
      const img = imgs.find((i) => i.id === txt.id.replace(/-txt$/, "-img"));
      expect(img).toBeDefined();
      expect((txt.y_percent ?? 0) > (img!.y_percent ?? 0) + (img!.h_percent ?? 0)).toBe(true);
    }
  });

  it("builds six fill_blanks and one letter_mixup", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    const fill = screens.filter((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return p?.type === "interaction" && p.subtype === "fill_blanks";
    });
    const spell = screens.filter((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return p?.type === "interaction" && p.subtype === "letter_mixup";
    });
    expect(fill).toHaveLength(6);
    for (const row of fill) {
      const p = parseScreenPayload(row.screen_type, row.payload);
      if (p?.type !== "interaction" || p.subtype !== "fill_blanks") continue;
      expect(p.body_text).toBe("");
      expect(p.guide).toBeUndefined();
      expect(p.image_use_tts).toBe(true);
      expect(p.image_read_aloud_text?.length).toBeGreaterThan(0);
      expect(p.word_bank?.length).toBe(4);
    }
    expect(spell).toHaveLength(6);
    for (const row of spell) {
      const p = parseScreenPayload("interaction", row.payload);
      if (p?.type !== "interaction" || p.subtype !== "letter_mixup") continue;
      expect(p.items).toHaveLength(1);
      expect(p.image_url).toMatch(/^https:\/\//);
      expect(p.prompt).toBe("Spell the word.");
      expect(p.guide).toBeUndefined();
      expect(p.image_use_tts).toBe(true);
      expect(p.image_read_aloud_text?.length).toBeGreaterThan(0);
    }
  });

  it("enables auto_advance_on_pass on practice interactions and story screens", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    const learn = parseScreenPayload("story", screens[1]?.payload);
    const drag = screens.find((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return p?.type === "story" && getNormalizedStoryPages(p).some((pg) => pg.id === "drag-match");
    });
    const dragParsed = parseScreenPayload("story", drag?.payload);
    expect(learn?.type === "story" && learn.auto_advance_on_pass).toBe(true);
    expect(dragParsed?.type === "story" && dragParsed.auto_advance_on_pass).toBe(true);

    for (const row of screens) {
      const p = parseScreenPayload(row.screen_type, row.payload);
      if (p?.type === "interaction") {
        expect(p.auto_advance_on_pass, p.subtype).toBe(true);
      }
    }
    const opening = parseScreenPayload("start", screens[0]?.payload);
    expect(opening?.type).toBe("start");
    if (opening?.type === "start") {
      expect(opening.auto_advance_on_pass).not.toBe(true);
    }
  });

  it("builds grammatical statements on word-to-picture true_false screens", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    const wordTf = screens.filter((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return (
        p?.type === "interaction" &&
        p.subtype === "true_false" &&
        p.quiz_group_id === "vocab-tf-word"
      );
    });
    expect(wordTf.length).toBeGreaterThan(0);
    for (const row of wordTf) {
      const p = parseScreenPayload(row.screen_type, row.payload);
      if (p?.type !== "interaction" || p.subtype !== "true_false") continue;
      expect(isPictureDescriptionStatement(p.statement), p.statement).toBe(true);
      expect(hasBrokenThisIsPattern(p.statement), p.statement).toBe(false);
      expect(isClozeDerivedSentence(A1_BREAKFAST_FOOD, p.statement), p.statement).toBe(false);
    }
    const eggs = A1_BREAKFAST_FOOD.words.find((w) => w.id === "eggs");
    expect(eggs).toBeDefined();
    expect(thisLemmaStatement(eggs!)).toBe("These are eggs.");
  });

  it("uses real media URLs on true_false screens when available", () => {
    const screens = buildVocabularySetScreens(A1_BREAKFAST_FOOD, { seed, practiceCount: 6 });
    const tf = screens.filter((s) => {
      const p = parseScreenPayload(s.screen_type, s.payload);
      return p?.type === "interaction" && p.subtype === "true_false";
    });
    const supabaseCount = tf.filter((s) => {
      const p = parseScreenPayload("interaction", s.payload);
      return (
        p?.type === "interaction" &&
        p.subtype === "true_false" &&
        p.image_url?.includes("supabase.co")
      );
    }).length;
    expect(supabaseCount).toBeGreaterThanOrEqual(4);
  });
});
