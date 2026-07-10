import type { SecondaryPartOfSpeech } from "@/lib/secondary/types";

export type SentenceWordFormInput = {
  targetWord: string;
  lemma?: string | null;
  partOfSpeech?: SecondaryPartOfSpeech | null;
};

function normalizeForm(value: string): string {
  return value.trim().toLowerCase();
}

function addForm(forms: Set<string>, value: string): void {
  const normalized = normalizeForm(value);
  if (normalized.length >= 2) {
    forms.add(normalized);
  }
}

function endsWithAny(value: string, suffixes: string[]): boolean {
  return suffixes.some((suffix) => value.endsWith(suffix));
}

function isConsonant(char: string): boolean {
  return /[b-df-hj-np-tv-z]/i.test(char);
}

function pluralizeNoun(root: string): string {
  if (endsWithAny(root, ["s", "x", "z", "ch", "sh"])) {
    return `${root}es`;
  }
  if (root.endsWith("y") && root.length > 2 && isConsonant(root.at(-2) ?? "")) {
    return `${root.slice(0, -1)}ies`;
  }
  return `${root}s`;
}

function thirdPersonSingular(root: string): string {
  if (endsWithAny(root, ["s", "x", "z", "ch", "sh"])) {
    return `${root}es`;
  }
  if (root.endsWith("y") && root.length > 2 && isConsonant(root.at(-2) ?? "")) {
    return `${root.slice(0, -1)}ies`;
  }
  return `${root}s`;
}

function presentParticiple(root: string): string {
  if (root.endsWith("ie")) {
    return `${root.slice(0, -2)}ying`;
  }
  if (root.endsWith("e") && !root.endsWith("ee")) {
    return `${root.slice(0, -1)}ing`;
  }
  return `${root}ing`;
}

function pastTense(root: string): string {
  if (root.endsWith("e")) {
    return `${root}d`;
  }
  if (
    root.length >= 3 &&
    isConsonant(root.at(-1) ?? "") &&
    isConsonant(root.at(-2) ?? "") &&
    !isConsonant(root.at(-3) ?? "")
  ) {
    return `${root}${root.at(-1)}ed`;
  }
  return `${root}ed`;
}

/** Irregular surface forms for verbs in the secondary sentence bank. */
const IRREGULAR_VERB_FORMS: Record<string, string[]> = {
  feed: ["fed"],
  get: ["got", "gotten"],
  hang: ["hung"],
  leave: ["left"],
  sleep: ["slept"],
  sweep: ["swept"],
  take: ["took", "taken"],
  wake: ["woke", "woken"],
};

function expandVerbForms(root: string, forms: Set<string>): void {
  addForm(forms, root);
  addForm(forms, thirdPersonSingular(root));
  addForm(forms, presentParticiple(root));
  addForm(forms, pastTense(root));
  for (const irregular of IRREGULAR_VERB_FORMS[root] ?? []) {
    addForm(forms, irregular);
  }
}

function expandAdjectiveForms(root: string, forms: Set<string>): void {
  addForm(forms, root);
  if (root.length >= 3 && !root.endsWith("ly")) {
    if (root.endsWith("y") && root.length > 3 && isConsonant(root.at(-2) ?? "")) {
      const stem = root.slice(0, -1);
      addForm(forms, `${stem}ier`);
      addForm(forms, `${stem}iest`);
      addForm(forms, `${stem}ily`);
    } else if (root.endsWith("e")) {
      addForm(forms, `${root.slice(0, -1)}er`);
      addForm(forms, `${root.slice(0, -1)}est`);
      addForm(forms, `${root}ly`);
    } else {
      addForm(forms, `${root}er`);
      addForm(forms, `${root}est`);
      addForm(forms, `${root}ly`);
    }
  }
}

function expandNounForms(root: string, forms: Set<string>): void {
  addForm(forms, root);
  addForm(forms, pluralizeNoun(root));
}

function expandPhraseForms(
  phrase: string,
  partOfSpeech: SecondaryPartOfSpeech | null | undefined,
  forms: Set<string>,
): void {
  const normalizedPhrase = normalizeForm(phrase);
  addForm(forms, normalizedPhrase);

  const parts = normalizedPhrase.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return;

  const head = parts[0] ?? "";
  const tail = parts.slice(1).join(" ");
  if (!head || !tail) return;

  if (partOfSpeech === "verb" || partOfSpeech === "phrase") {
    const headForms = new Set<string>();
    expandVerbForms(head, headForms);
    for (const headForm of headForms) {
      addForm(forms, `${headForm} ${tail}`);
    }
  }
}

function expandRootForms(root: string, partOfSpeech: SecondaryPartOfSpeech | null | undefined): Set<string> {
  const forms = new Set<string>();

  if (root.includes(" ")) {
    expandPhraseForms(root, partOfSpeech, forms);
    return forms;
  }

  addForm(forms, root);

  switch (partOfSpeech) {
    case "verb":
      expandVerbForms(root, forms);
      break;
    case "adjective":
      expandAdjectiveForms(root, forms);
      break;
    case "adverb":
      addForm(forms, root);
      if (root.endsWith("ly") && root.length > 3) {
        addForm(forms, root.slice(0, -2));
      }
      break;
    case "noun":
      expandNounForms(root, forms);
      break;
    case "phrase":
      expandPhraseForms(root, partOfSpeech, forms);
      break;
    default:
      expandVerbForms(root, forms);
      expandAdjectiveForms(root, forms);
      expandNounForms(root, forms);
      break;
  }

  return forms;
}

export function buildSentenceWordFormCandidates(input: SentenceWordFormInput): string[] {
  const roots = new Set<string>();
  addForm(roots, input.targetWord);
  if (input.lemma) {
    addForm(roots, input.lemma);
  }

  const candidates = new Set<string>();
  for (const root of roots) {
    for (const form of expandRootForms(root, input.partOfSpeech ?? null)) {
      candidates.add(form);
    }
  }

  return [...candidates];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sentenceContainsWordForm(text: string, candidates: readonly string[]): boolean {
  if (candidates.length === 0) return false;

  const normalizedText = normalizeForm(text);
  const ordered = [...candidates].sort((left, right) => right.length - left.length);

  for (const candidate of ordered) {
    const pattern = candidate.includes(" ")
      ? new RegExp(`(?:^|\\s)${escapeRegExp(candidate)}(?=\\s|[.?!]|$)`, "i")
      : new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i");

    if (pattern.test(normalizedText)) {
      return true;
    }
  }

  return false;
}

export function sentenceContainsTargetWordForms(
  text: string,
  input: SentenceWordFormInput,
): boolean {
  return sentenceContainsWordForm(text, buildSentenceWordFormCandidates(input));
}
