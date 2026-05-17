import { describe, expect, it } from "vitest";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import { buildVocabularyPracticeContext } from "./build-screens";
import {
  VOCAB_CLOZE_GROUP_ID,
  VOCAB_CLOZE_GROUP_TITLE,
  buildVocabClozeWordBank,
  buildVocabFillBlanksPayload,
  fillVocabClozeTemplate,
  pickVocabClozeForWord,
  vocabClozeVariants,
} from "./vocab-cloze";

describe("vocab cloze", () => {
  const ctx = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
    seed: "cloze-test",
    practiceCount: 6,
  });
  const word = ctx.practiceWords[0]!;

  it("normalizes single or multiple variants", () => {
    expect(vocabClozeVariants(A1_BREAKFAST_FOOD.words[0]!)).toHaveLength(2);
  });

  it("picks a stable cloze variant per seed", () => {
    const a = pickVocabClozeForWord(word, "pick-a");
    const b = pickVocabClozeForWord(word, "pick-a");
    const c = pickVocabClozeForWord(word, "pick-b");
    expect(a.template).toBe(b.template);
    expect(vocabClozeVariants(word).map((v) => v.template)).toContain(a.template);
    const allDifferent =
      vocabClozeVariants(word).length > 1 &&
      pickVocabClozeForWord(word, "pick-a").template !==
        pickVocabClozeForWord(word, "pick-b").template;
    expect(allDifferent || vocabClozeVariants(word).length === 1).toBe(true);
  });

  it("fills template for TTS", () => {
    const cloze = pickVocabClozeForWord(word, ctx.seed);
    expect(fillVocabClozeTemplate(cloze.template, "1", word.lemma)).toContain(word.lemma);
  });

  it("builds word bank with target and three distractors", () => {
    const bank = buildVocabClozeWordBank(word, ctx.practiceWords, ctx.seed);
    expect(bank).toHaveLength(4);
    expect(bank).toContain(word.lemma);
    expect(new Set(bank).size).toBe(4);
  });

  it("builds immersive fill_blanks payload from picked variant", () => {
    const cloze = pickVocabClozeForWord(word, ctx.seed);
    const raw = buildVocabFillBlanksPayload(word, ctx, 0);
    const parsed = parseScreenPayload("interaction", raw);
    expect(parsed?.type).toBe("interaction");
    if (parsed?.type !== "interaction" || parsed.subtype !== "fill_blanks") return;

    expect(parsed.body_text).toBe("");
    expect(parsed.guide).toBeUndefined();
    expect(parsed.image_use_tts).toBe(true);
    expect(parsed.image_read_aloud_text).toBe(word.tts ?? word.lemma);
    expect(parsed.image_size).toBe("small");
    expect(parsed.auto_advance_on_pass).toBe(true);
    expect(parsed.quiz_group_id).toBe(VOCAB_CLOZE_GROUP_ID);
    expect(parsed.quiz_group_title).toBe(VOCAB_CLOZE_GROUP_TITLE);
    expect(parsed.template).toBe(cloze.template);
    expect(parsed.word_bank).toHaveLength(4);
  });

  it("can pick different templates for milk across seeds", () => {
    const milk = A1_BREAKFAST_FOOD.words.find((w) => w.id === "milk")!;
    const templates = new Set(
      Array.from({ length: 24 }, (_, i) => pickVocabClozeForWord(milk, `run-${i}`).template),
    );
    expect(templates.size).toBeGreaterThan(1);
  });
});
