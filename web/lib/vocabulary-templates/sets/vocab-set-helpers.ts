import type { VocabWord, VocabWordCloze } from "../types";

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
