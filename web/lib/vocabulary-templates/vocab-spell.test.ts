import { describe, expect, it } from "vitest";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import { buildVocabularyPracticeContext } from "./build-screens";
import {
  VOCAB_SPELL_GROUP_ID,
  VOCAB_SPELL_GROUP_TITLE,
  VOCAB_SPELL_IMMERSIVE_PROMPT,
  buildVocabLetterMixupPayload,
  vocabSpellAcceptedWords,
} from "./vocab-spell";

describe("vocab spell", () => {
  const ctx = buildVocabularyPracticeContext(A1_BREAKFAST_FOOD, {
    seed: "spell-test",
    practiceCount: 6,
  });
  const word = ctx.practiceWords[0]!;

  it("builds accepted word variants", () => {
    const accepted = vocabSpellAcceptedWords(word);
    expect(accepted).toContain(word.lemma);
    expect(accepted.length).toBeGreaterThanOrEqual(1);
  });

  it("builds letter_mixup payload for vocab sets", () => {
    const raw = buildVocabLetterMixupPayload(word, ctx.seed, 0);
    const parsed = parseScreenPayload("interaction", raw);
    expect(parsed?.type).toBe("interaction");
    if (parsed?.type !== "interaction" || parsed.subtype !== "letter_mixup") return;

    expect(parsed.prompt).toBe(VOCAB_SPELL_IMMERSIVE_PROMPT);
    expect(parsed.guide).toBeUndefined();
    expect(parsed.image_use_tts).toBe(true);
    expect(parsed.image_read_aloud_text).toBe(word.tts ?? word.lemma);
    expect(parsed.shuffle_letters).toBe(true);
    expect(parsed.letter_shuffle_seed).toBe(`${ctx.seed}:spell-letters:${word.id}`);
    expect(parsed.auto_advance_on_pass).toBe(true);
    expect(parsed.quiz_group_id).toBe(VOCAB_SPELL_GROUP_ID);
    expect(parsed.quiz_group_title).toBe(VOCAB_SPELL_GROUP_TITLE);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.target_word).toBe(word.lemma);
  });
});
