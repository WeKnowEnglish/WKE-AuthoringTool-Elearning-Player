import { describe, expect, it } from "vitest";
import { STRUCTURES } from "@/data/quiz-builder-structures";
import type { Question, VocabularyItem } from "@/types/quiz-builder-brain";
import {
  escapeRegExp,
  fillBlankPrompt,
  generateQuiz,
  normalize,
  pickCompatibleVocab,
  pickInsertedWord,
  promptContainsToken,
  scramblePreservingCase,
  tokenize,
  validateQuestion,
} from "@/lib/quiz-builder-brain";
import { VOCAB } from "@/data/quiz-builder-vocab";

describe("normalize / escapeRegExp", () => {
  it("normalizes case", () => {
    expect(normalize("Eat")).toBe("eat");
  });

  it("escapes regex metacharacters so literals match only themselves", () => {
    const pattern = `^${escapeRegExp("a.c")}$`;
    expect(new RegExp(pattern).test("a.c")).toBe(true);
    expect(new RegExp(pattern).test("abc")).toBe(false);
  });
});

describe("tokenize / promptContainsToken", () => {
  it("tokenizes words only", () => {
    expect(tokenize("She eats every day")).toEqual(["She", "eats", "every", "day"]);
  });

  it("does not treat substring as token match", () => {
    expect(promptContainsToken("I like pineapple", "apple")).toBe(false);
  });

  it("detects whole-word answer in prompt", () => {
    expect(promptContainsToken("She eats daily", "eats")).toBe(true);
  });
});

describe("pickInsertedWord", () => {
  const eat: VocabularyItem = {
    id: "v1",
    word: "eat",
    type: "verb",
    topic: "food",
    level: "A1",
    verbCategory: "action",
    baseForm: "eat",
    presentSimple3sg: "eats",
    pastSimple: "ate",
  };

  it("uses 3sg for She templates", () => {
    const s = STRUCTURES.find((x) => x.id === "s1")!;
    expect(pickInsertedWord(s, eat)).toBe("eats");
  });

  it("uses base for I templates", () => {
    const s = STRUCTURES.find((x) => x.id === "s2")!;
    expect(pickInsertedWord(s, eat)).toBe("eat");
  });

  it("uses noun word for vocab target", () => {
    const s = STRUCTURES.find((x) => x.id === "s4")!;
    const apple: VocabularyItem = {
      id: "n1",
      word: "apple",
      type: "noun",
      topic: "food",
      level: "A1",
      plural: "apples",
    };
    expect(pickInsertedWord(s, apple)).toBe("apple");
  });
});

describe("pickCompatibleVocab", () => {
  const wide = VOCAB.filter((v) => v.level === "A1");
  const foodOnly = wide.filter((v) => v.topic === "food");

  it("filters uncountable nouns for uncountable structure", () => {
    const s5 = STRUCTURES.find((x) => x.id === "s5")!;
    const pool = pickCompatibleVocab(s5, foodOnly, wide);
    expect(pool.every((v) => v.type !== "noun" || v.countable === false)).toBe(true);
    expect(pool.some((v) => v.word === "rice")).toBe(true);
  });

  it("filters countable nouns for This is a ___", () => {
    const s4 = STRUCTURES.find((x) => x.id === "s4")!;
    const pool = pickCompatibleVocab(s4, foodOnly, wide);
    expect(pool.every((v) => v.type !== "noun" || v.countable !== false)).toBe(true);
    expect(pool.some((v) => v.word === "apple")).toBe(true);
  });
});

describe("fillBlankPrompt", () => {
  it("replaces first matching whole word only", () => {
    expect(fillBlankPrompt("She eats every day", "eats")).toBe("She ___ every day");
  });

  it("does not replace inside a larger token", () => {
    expect(fillBlankPrompt("I like pineapple", "apple")).toBeNull();
  });

  it("safely replaces when answer would be a regex metacharacter without escaping", () => {
    expect(fillBlankPrompt("I see a cat.", "cat")).toBe("I see a ___.");
  });
});

describe("validateQuestion", () => {
  const emptyReject = () => ({
    mcq_leak: 0,
    dup_options: 0,
    no_distractors: 0,
    grammar_heuristic: 0,
  });

  it("rejects MCQ when answer appears as token in prompt", () => {
    const rc = emptyReject();
    const q: Question = {
      id: "1",
      type: "mcq",
      prompt: "She eats every day",
      correctAnswer: "eats",
      options: ["eats", "run", "read"],
      metadata: { structureId: "s", vocabId: "v", topic: "t", level: "A1" },
    };
    const r = validateQuestion(q, rc);
    expect(r).toEqual({ valid: false, reason: "mcq_leak" });
    expect(rc.mcq_leak).toBe(1);
  });

  it("accepts cloze MCQ when answer is not a token in prompt", () => {
    const rc = emptyReject();
    const q: Question = {
      id: "1",
      type: "mcq",
      prompt: "She ___ every day",
      correctAnswer: "eats",
      options: ["eats", "eat", "eating"],
      metadata: { structureId: "s", vocabId: "v", topic: "t", level: "A1" },
    };
    expect(validateQuestion(q, rc)).toEqual({ valid: true });
  });

  it("rejects duplicate options", () => {
    const rc = emptyReject();
    const q: Question = {
      id: "1",
      type: "mcq",
      prompt: "She ___ every day",
      correctAnswer: "eats",
      options: ["eats", "Run", "run"],
      metadata: { structureId: "s", vocabId: "v", topic: "t", level: "A1" },
    };
    const r = validateQuestion(q, rc);
    expect(r).toEqual({ valid: false, reason: "dup_options" });
    expect(rc.dup_options).toBe(1);
  });

  it("rejects obvious grammar heuristic", () => {
    const rc = emptyReject();
    const q: Question = {
      id: "1",
      type: "fill_blank",
      prompt: "I ___ every day",
      correctAnswer: "goes",
      options: [],
      metadata: { structureId: "s", vocabId: "v", topic: "t", level: "A1" },
    };
    const r = validateQuestion(q, rc);
    expect(r).toEqual({ valid: false, reason: "grammar_heuristic" });
    expect(rc.grammar_heuristic).toBe(1);
  });
});

describe("scramblePreservingCase", () => {
  it("returns a string", () => {
    expect(scramblePreservingCase("hello").length).toBe(5);
  });
});

describe("generateQuiz", () => {
  it("builds a 10-question practice quiz with invariants", () => {
    const quiz = generateQuiz({
      topic: "food",
      level: "A1",
      mode: "practice",
      questionCount: 10,
    });

    expect(quiz.meta).toEqual({ topic: "food", level: "A1", mode: "practice" });
    expect(quiz.questions.length).toBe(10);

    const keys = new Set<string>();
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i]!;
      const key = `${q.metadata.structureId}|${q.metadata.vocabId}|${q.type}|${normalize(q.correctAnswer)}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);

      if (i > 0) {
        expect(quiz.questions[i - 1]!.type).not.toBe(q.type);
      }

      expect(q.metadata.topic).toBe("food");
      expect(q.metadata.level).toBe("A1");

      if (q.type === "mcq") {
        expect(q.prompt).toContain("___");
        expect(promptContainsToken(q.prompt, q.correctAnswer)).toBe(false);
        expect(q.options).toHaveLength(3);
        const set = new Set(q.options.map(normalize));
        expect(set.has(normalize(q.correctAnswer))).toBe(true);
        expect(set.size).toBe(3);
      }

      if (q.type === "fill_blank") {
        expect(q.prompt).toContain("___");
      }

      if (q.type === "letter_scramble" && q.correctAnswer.length > 2) {
        expect(q.prompt).not.toBe(q.correctAnswer);
      }
    }
  });

  it("generates stable quiz under stress", () => {
    const quiz = generateQuiz({
      topic: "food",
      level: "A1",
      mode: "practice",
      questionCount: 20,
    });

    expect(quiz.questions.length).toBeGreaterThan(10);
  });

  it("throws when no structures exist for level", () => {
    expect(() =>
      generateQuiz({
        topic: "food",
        level: "A2",
        mode: "quick",
        questionCount: 1,
      }),
    ).toThrow(/no structures/);
  });
});
