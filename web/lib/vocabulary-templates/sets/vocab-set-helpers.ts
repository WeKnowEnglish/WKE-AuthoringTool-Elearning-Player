import { inferLemmaGrammar } from "../lemma-statement";
import type { VocabLemmaGrammar, VocabMealVerb, VocabWord, VocabWordCloze } from "../types";

export function ACCEPT(lemma: string): string[] {
  const cap = lemma.charAt(0).toUpperCase() + lemma.slice(1);
  return lemma === cap ? [lemma] : [lemma, cap];
}

export function vocabWordImageUrl(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  placeholderHex = "fef3c7",
  placeholderInk = "92400e",
): string {
  return (
    mediaUrls[id] ??
    `https://placehold.co/400x400/${placeholderHex}/${placeholderInk}?text=${encodeURIComponent(lemma)}`
  );
}

export function animalWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  clozeA: string,
  clozeB: string,
  opts?: {
    placeholderHex?: string;
    placeholderInk?: string;
    tts?: string;
    grammar?: VocabWord["grammar"];
    mealVerb?: VocabWord["mealVerb"];
  },
): VocabWord {
  return {
    id,
    lemma,
    grammar: opts?.grammar ?? "count",
    mealVerb: opts?.mealVerb ?? "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex,
      opts?.placeholderInk,
    ),
    cloze: [
      { template: clozeA, acceptable: ACCEPT(lemma) },
      { template: clozeB, acceptable: ACCEPT(lemma) },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function clozePair(a: string, b: string, acceptable: string[]): [VocabWordCloze, VocabWordCloze] {
  return [
    { template: a, acceptable },
    { template: b, acceptable },
  ];
}

export function clothesWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? inferLemmaGrammar(lemma);
  const acceptable = ACCEPT(lemma);
  const clozeA =
    opts?.clozeA ??
    (grammar === "plural" ? "These are my __1__." : "I wear my __1__.");
  const clozeB =
    opts?.clozeB ??
    (grammar === "plural" ? "I put on my __1__." : "I put on my __1__.");
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "e0e7ff",
      opts?.placeholderInk ?? "3730a3",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

const SUBJECT_LEMMAS = new Set(["maths", "english", "art"]);

export function schoolSuppliesWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const lower = lemma.trim().toLowerCase();
  const grammar = opts?.grammar ?? inferLemmaGrammar(lemma);
  const acceptable = ACCEPT(lemma);
  const isSubject = SUBJECT_LEMMAS.has(lower);
  const clozeA =
    opts?.clozeA ??
    (isSubject ? "I like __1__." : "I have a __1__.");
  const clozeB =
    opts?.clozeB ??
    (isSubject ? "We study __1__." : "I use my __1__.");
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "fef3c7",
      opts?.placeholderInk ?? "92400e",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function schoolActivityWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? "uncountable";
  const acceptable = ACCEPT(lemma);
  const clozeA = opts?.clozeA ?? "I like to __1__.";
  const clozeB = opts?.clozeB ?? "We __1__ at school.";
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "dbeafe",
      opts?.placeholderInk ?? "1e40af",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function bodyPartWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? inferLemmaGrammar(lemma);
  const acceptable = ACCEPT(lemma);
  const clozeA = opts?.clozeA ?? "This is my __1__.";
  const clozeB = opts?.clozeB ?? "I have a __1__.";
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "fce7f3",
      opts?.placeholderInk ?? "9d174d",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function foodWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    mealVerb?: VocabMealVerb;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    acceptable?: string[];
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? inferLemmaGrammar(lemma);
  const mealVerb = opts?.mealVerb ?? "eat";
  const acceptable = opts?.acceptable ?? ACCEPT(lemma);
  const clozeA = opts?.clozeA ?? "I like __1__.";
  const clozeB = opts?.clozeB ?? "I eat __1__.";
  return {
    id,
    lemma,
    grammar,
    mealVerb,
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "fef3c7",
      opts?.placeholderInk ?? "92400e",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function jobWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? "count";
  const acceptable = ACCEPT(lemma);
  const clozeA = opts?.clozeA ?? "He is a __1__.";
  const clozeB = opts?.clozeB ?? "She is a __1__.";
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "ddd6fe",
      opts?.placeholderInk ?? "5b21b6",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function toyWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? inferLemmaGrammar(lemma);
  const acceptable = ACCEPT(lemma);
  const clozeA = opts?.clozeA ?? "I play with __1__.";
  const clozeB = opts?.clozeB ?? "I have __1__.";
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "fef9c3",
      opts?.placeholderInk ?? "a16207",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}

export function weatherWord(
  mediaUrls: Record<string, string | undefined>,
  id: string,
  lemma: string,
  opts?: {
    grammar?: VocabLemmaGrammar;
    tts?: string;
    clozeA?: string;
    clozeB?: string;
    placeholderHex?: string;
    placeholderInk?: string;
  },
): VocabWord {
  const grammar = opts?.grammar ?? inferLemmaGrammar(lemma);
  const acceptable = ACCEPT(lemma);
  const isSceneAdj = grammar === "uncountable" && /^(sunny|cloudy|rainy|snowy|windy|hot|cold|warm)$/i.test(lemma);
  const clozeA =
    opts?.clozeA ??
    (isSceneAdj ? "It is __1__." : grammar === "count" ? "I see a __1__." : "I see __1__.");
  const clozeB =
    opts?.clozeB ??
    (isSceneAdj ?
      "Today is __1__."
    : grammar === "count" ?
      "There is a __1__ in the sky."
    : "The __1__ is here.");
  return {
    id,
    lemma,
    grammar,
    mealVerb: "none",
    imageUrl: vocabWordImageUrl(
      mediaUrls,
      id,
      lemma,
      opts?.placeholderHex ?? "e0f2fe",
      opts?.placeholderInk ?? "0c4a6e",
    ),
    cloze: [
      { template: clozeA, acceptable },
      { template: clozeB, acceptable },
    ],
    ...(opts?.tts ? { tts: opts.tts } : {}),
  };
}
