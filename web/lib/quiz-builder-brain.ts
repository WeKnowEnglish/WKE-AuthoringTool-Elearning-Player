import { STRUCTURES } from "@/data/quiz-builder-structures";
import { VOCAB } from "@/data/quiz-builder-vocab";
import type {
  CefrLevel,
  GenerateQuizOptions,
  Question,
  QuestionType,
  QuizMode,
  QuizSession,
  Structure,
  StructureIntent,
  VerbCategory,
  VocabularyItem,
} from "@/types/quiz-builder-brain";

const BLANK = "___";
const THIRD_SG = new Set(["she", "he", "it"]);

/** Case-insensitive comparison key; use everywhere equality is needed on surface forms. */
export function normalize(s: string): string {
  return s.toLowerCase();
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tokenize(text: string): string[] {
  return text.match(/\b\w+\b/g) ?? [];
}

export function promptContainsToken(prompt: string, word: string): boolean {
  return tokenize(prompt).some((t) => t === word);
}

const INTENT_RULES: Record<
  StructureIntent,
  { verbCategories?: VerbCategory[]; countable?: boolean }
> = {
  present_simple_base: { verbCategories: ["action"] },
  present_simple_3sg: { verbCategories: ["action"] },
  countable_noun: { countable: true },
  uncountable_noun: { countable: false },
};

export type RejectCounts = {
  mcq_leak: number;
  dup_options: number;
  no_distractors: number;
  grammar_heuristic: number;
};

export type ValidateQuestionResult =
  | { valid: true }
  | { valid: false; reason: string };

function firstWordBeforeBlank(template: string): string {
  const [before] = template.split(BLANK);
  const first = before?.trim().split(/\s+/)[0];
  return first ?? "";
}

function isThirdPersonSingularSubject(template: string): boolean {
  const subject = normalize(firstWordBeforeBlank(template));
  return THIRD_SG.has(subject);
}

function effectiveVerbCategory(v: VocabularyItem): VerbCategory {
  return v.verbCategory ?? "action";
}

/** `true` when countable or omitted; explicit `countable: false` is uncountable. */
function effectiveCountable(v: VocabularyItem): boolean {
  return v.countable !== false;
}

function matchesTarget(structure: Structure, v: VocabularyItem): boolean {
  if (structure.target === "verb") return v.type === "verb";
  return v.type === "noun";
}

function matchesIntent(structure: Structure, v: VocabularyItem): boolean {
  const rules = INTENT_RULES[structure.intent];
  if (rules.verbCategories && v.type === "verb") {
    if (!rules.verbCategories.includes(effectiveVerbCategory(v))) return false;
  }
  if (rules.countable !== undefined && v.type === "noun") {
    if (effectiveCountable(v) !== rules.countable) return false;
  }
  return true;
}

/**
 * Topic-primary pool with fallbacks: topic+filters → level+filters → level+target only.
 */
export function pickCompatibleVocab(
  structure: Structure,
  primaryTopicPool: VocabularyItem[],
  wideLevelPool: VocabularyItem[],
): VocabularyItem[] {
  let pool = primaryTopicPool.filter((v) => matchesTarget(structure, v) && matchesIntent(structure, v));
  if (pool.length > 0) return pool;
  pool = wideLevelPool.filter((v) => matchesTarget(structure, v) && matchesIntent(structure, v));
  if (pool.length > 0) return pool;
  return wideLevelPool.filter((v) => matchesTarget(structure, v));
}

/** Inserts surface form for blank; nouns use lemma `word`. */
export function pickInsertedWord(structure: Structure, vocab: VocabularyItem): string {
  if (structure.target === "vocab") {
    return vocab.word;
  }
  if (vocab.type !== "verb") {
    return vocab.word;
  }
  if (isThirdPersonSingularSubject(structure.template)) {
    if (vocab.presentSimple3sg) return vocab.presentSimple3sg;
    return `${vocab.word}s`;
  }
  return vocab.baseForm ?? vocab.word;
}

function dedupeKey(
  structureId: string,
  vocabId: string,
  type: QuestionType,
  correctAnswer: string,
): string {
  return `${structureId}|${vocabId}|${type}|${normalize(correctAnswer)}`;
}

/**
 * First whole-word match of `correctAnswer` (word boundaries, regex-safe) → `___`.
 * Matches the same `\b\w+\b` token contract as `tokenize` for normal words.
 */
export function fillBlankPrompt(
  filledSentence: string,
  correctAnswer: string,
): string | null {
  const re = new RegExp(`\\b${escapeRegExp(correctAnswer)}\\b`);
  if (!re.test(filledSentence)) return null;
  return filledSentence.replace(re, BLANK);
}

function fillTemplate(structure: Structure, inserted: string): string {
  if (!structure.template.includes(BLANK)) {
    throw new Error(`Structure ${structure.id} missing ${BLANK} placeholder`);
  }
  return structure.template.replace(BLANK, inserted);
}

/**
 * MVP uses Math.random(). For reproducible sessions / debugging, consider an
 * injectable RNG or optional seed (not implemented in this pass).
 */
function randomInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function shuffleCopy<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[randomInt(items.length)]!;
}

/** Scramble preserves casing; reshuffle up to 5 times if unchanged (case-sensitive). */
export function scramblePreservingCase(correctAnswer: string): string {
  const orig = correctAnswer;
  if (orig.length <= 1) return orig;
  for (let attempt = 0; attempt < 5; attempt++) {
    const chars = [...orig];
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      const a = chars[i]!;
      const b = chars[j]!;
      chars[i] = b;
      chars[j] = a;
    }
    const s = chars.join("");
    if (s !== orig) return s;
  }
  if (orig.length > 2) {
    const rotated = orig.slice(1) + orig[0]!;
    if (rotated !== orig) return rotated;
  }
  return orig;
}

function allowedTypes(mode: QuizMode): QuestionType[] {
  return mode === "quick" ? ["mcq", "fill_blank"] : ["mcq", "fill_blank", "letter_scramble"];
}

function weightedFormatDraw(mode: QuizMode): QuestionType {
  const r = Math.random();
  if (mode === "quick") {
    return r < 0.7 ? "mcq" : "fill_blank";
  }
  if (r < 0.4) return "mcq";
  if (r < 0.8) return "fill_blank";
  return "letter_scramble";
}

function pickFormatAvoidingAdjacent(mode: QuizMode, last: QuestionType | null): QuestionType {
  const allowed = allowedTypes(mode);
  for (let i = 0; i < 8; i++) {
    const fmt = weightedFormatDraw(mode);
    if (last === null || fmt !== last) return fmt;
  }
  const others = allowed.filter((t) => t !== last);
  return others.length > 0 ? others[0]! : allowed[0]!;
}

/** Same countable class for noun distractors (same-topic pass). */
function sameCountableClass(a: VocabularyItem, b: VocabularyItem): boolean {
  return effectiveCountable(a) === effectiveCountable(b);
}

function buildDistractorStrings(
  structure: Structure,
  vocab: VocabularyItem,
  correctAnswer: string,
  wideVocab: VocabularyItem[],
): string[] {
  const usedNorm = new Set<string>([normalize(correctAnswer)]);
  const out: string[] = [];

  const push = (s: string | undefined) => {
    if (s === undefined) return;
    const n = normalize(s);
    if (usedNorm.has(n)) return;
    if (normalize(s) === normalize(correctAnswer)) return;
    usedNorm.add(n);
    out.push(s);
  };

  const intent = structure.intent;

  if (vocab.type === "verb") {
    if (intent === "present_simple_3sg") {
      push(vocab.baseForm);
      push(`${correctAnswer}ing`);
    } else if (intent === "present_simple_base") {
      push(vocab.presentSimple3sg);
      push(`${correctAnswer}ing`);
    }
    const sameTopicVerbs = wideVocab.filter(
      (x) => x.type === "verb" && x.topic === vocab.topic && x.id !== vocab.id,
    );
    for (const x of shuffleCopy(sameTopicVerbs)) {
      push(x.word);
      if (out.length >= 2) return out;
    }
  } else {
    if (vocab.plural && normalize(vocab.plural) !== normalize(correctAnswer)) {
      push(vocab.plural);
    }
    const sameTopicNouns = wideVocab.filter(
      (x) =>
        x.type === "noun" &&
        x.topic === vocab.topic &&
        x.id !== vocab.id &&
        sameCountableClass(x, vocab),
    );
    for (const x of shuffleCopy(sameTopicNouns)) {
      push(x.word);
      if (out.length >= 2) return out;
    }
  }

  if (out.length < 2) {
    const sameTypePreferClass = wideVocab.filter(
      (x) => x.type === vocab.type && x.id !== vocab.id && (vocab.type !== "noun" || sameCountableClass(x, vocab)),
    );
    for (const x of shuffleCopy(sameTypePreferClass)) {
      push(x.word);
      if (out.length >= 2) return out;
    }
  }

  if (out.length < 2) {
    const sameType = wideVocab.filter((x) => x.type === vocab.type && x.id !== vocab.id);
    for (const x of shuffleCopy(sameType)) {
      push(x.word);
      if (out.length >= 2) return out;
    }
  }

  return out;
}

function buildMcq(
  structure: Structure,
  vocab: VocabularyItem,
  correctAnswer: string,
  filledSentence: string,
  wideVocab: VocabularyItem[],
  rejectCounts: RejectCounts,
): Question | null {
  const prompt = fillBlankPrompt(filledSentence, correctAnswer);
  if (!prompt) return null;

  const distractors = buildDistractorStrings(structure, vocab, correctAnswer, wideVocab);
  if (distractors.length < 2) {
    rejectCounts.no_distractors++;
    return null;
  }

  const options = shuffleCopy([correctAnswer, distractors[0]!, distractors[1]!]);
  return {
    id: crypto.randomUUID(),
    type: "mcq",
    prompt,
    correctAnswer,
    options,
    metadata: {
      structureId: structure.id,
      vocabId: vocab.id,
      topic: "",
      level: vocab.level,
    },
  };
}

const GRAMMAR_HEURISTIC: RegExp[] = [/\bI goes\b/i, /\ba\s+(rice|milk|bread|juice)\b/i];

/** Lightweight safety net; increments `rejectCounts` on reject paths. */
export function validateQuestion(q: Question, rejectCounts: RejectCounts): ValidateQuestionResult {
  const surface = q.prompt.includes(BLANK) ? q.prompt.replace(BLANK, q.correctAnswer) : q.prompt;

  for (const re of GRAMMAR_HEURISTIC) {
    if (re.test(surface)) {
      rejectCounts.grammar_heuristic++;
      return { valid: false, reason: "grammar_heuristic" };
    }
  }

  if (q.type === "mcq") {
    if (promptContainsToken(q.prompt, q.correctAnswer)) {
      rejectCounts.mcq_leak++;
      return { valid: false, reason: "mcq_leak" };
    }
    const norms = q.options.map(normalize);
    if (new Set(norms).size !== norms.length) {
      rejectCounts.dup_options++;
      return { valid: false, reason: "dup_options" };
    }
  }

  return { valid: true };
}

function tryBuildQuestion(
  structure: Structure,
  vocab: VocabularyItem,
  type: QuestionType,
  metaTopic: string,
  metaLevel: CefrLevel,
  wideVocab: VocabularyItem[],
  rejectCounts: RejectCounts,
): Question | null {
  const correctAnswer = pickInsertedWord(structure, vocab);
  const filledSentence = fillTemplate(structure, correctAnswer);
  const metadata = {
    structureId: structure.id,
    vocabId: vocab.id,
    topic: metaTopic,
    level: metaLevel,
  };

  let q: Question | null = null;

  if (type === "fill_blank") {
    const prompt = fillBlankPrompt(filledSentence, correctAnswer);
    if (!prompt) return null;
    q = {
      id: crypto.randomUUID(),
      type: "fill_blank",
      prompt,
      correctAnswer,
      options: [],
      metadata,
    };
  } else if (type === "letter_scramble") {
    const prompt = scramblePreservingCase(correctAnswer);
    q = {
      id: crypto.randomUUID(),
      type: "letter_scramble",
      prompt,
      correctAnswer,
      options: [],
      metadata,
    };
  } else {
    const mcq = buildMcq(structure, vocab, correctAnswer, filledSentence, wideVocab, rejectCounts);
    if (!mcq) return null;
    q = { ...mcq, metadata: { ...mcq.metadata, topic: metaTopic, level: metaLevel } };
  }

  const v = validateQuestion(q, rejectCounts);
  if (!v.valid) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`validateQuestion: ${v.reason}`);
    }
    return null;
  }
  return q;
}

export function generateQuiz(options: GenerateQuizOptions): QuizSession {
  const { topic, level, mode, questionCount } = options;

  const rejectCounts: RejectCounts = {
    mcq_leak: 0,
    dup_options: 0,
    no_distractors: 0,
    grammar_heuristic: 0,
  };

  const structures = STRUCTURES.filter((s) => s.level === level);
  if (structures.length === 0) {
    throw new Error(`QuizBuilderBrain: no structures for level ${level}`);
  }

  const narrow = VOCAB.filter((v) => v.topic === topic && v.level === level);
  const wide = VOCAB.filter((v) => v.level === level);
  const primary = narrow.length < 3 ? wide : narrow;
  if (wide.length < 3) {
    throw new Error(
      `QuizBuilderBrain: vocabulary pool too small for level ${level} (wide.length=${wide.length}).`,
    );
  }

  const usedKeys = new Set<string>();
  const questions: Question[] = [];
  let lastType: QuestionType | null = null;
  const maxTotalAttempts = questionCount * 20;
  let totalAttempts = 0;

  while (questions.length < questionCount && totalAttempts < maxTotalAttempts) {
    totalAttempts++;
    const structure = pickRandom(structures);
    if (!structure) break;

    let pool = pickCompatibleVocab(structure, primary, wide);
    if (pool.length === 0) continue;

    const vocab = pickRandom(pool);
    if (!vocab) continue;

    let accepted: Question | null = null;
    for (let inner = 0; inner < 20 && !accepted; inner++) {
      const fmt = pickFormatAvoidingAdjacent(mode, lastType);
      const built = tryBuildQuestion(structure, vocab, fmt, topic, level, wide, rejectCounts);
      if (!built) continue;
      const key = dedupeKey(structure.id, vocab.id, built.type, built.correctAnswer);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      accepted = built;
      lastType = built.type;
    }

    if (accepted) {
      questions.push(accepted);
    }
  }

  if (questionCount > 0 && questions.length < questionCount * 0.5) {
    console.warn(`Low quality quiz generation: got ${questions.length}/${questionCount}`);
  }

  return {
    questions,
    meta: { topic, level, mode },
  };
}
