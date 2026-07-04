import type { ScreenPayload } from "@/lib/lesson-schemas";

export type StudentFacingLanguageRole =
  | "instruction"
  | "question"
  | "answer_choice"
  | "feedback"
  | "hint"
  | "label"
  | "story_text"
  | "tts_text"
  | "dialogue";

export type StudentFacingLanguageSurface = {
  path: string;
  role: StudentFacingLanguageRole;
  text: string;
};

export type StudentFacingLanguageIssue = {
  path: string;
  severity: "warning" | "error";
  code:
    | "broken_article_noun_agreement"
    | "wrong_meal_verb"
    | "unclear_placeholder"
    | "missing_sentence_punctuation"
    | "too_complex_for_a1"
    | "double_spacing";
  message: string;
};

export const ESL_STUDENT_FACING_LANGUAGE_POLICY = `Student-facing ESL language policy:
- Write only grammatical, natural classroom English.
- Match the requested CEFR band; for Pre-A1/A1, prefer one short clause and familiar vocabulary.
- Use clear learner actions: Tap, Choose, Listen, Say, Read, Write, Match, Drag.
- Do not introduce new language in a check before it has appeared in story or modeling.
- For count nouns, use correct articles and plurals: "This is an apple.", "These are apples."
- For uncountable nouns, do not use a/an or plural -s: "This is bread.", "I like bread."
- Use natural food verbs: "We drink milk/juice/water"; "We eat apples/bread/rice."
- Feedback should be encouraging and specific without giving confusing grammar models.
- Mascot or character dialogue should be warm, brief, and age-appropriate.`;

const STUDENT_FACING_KEYS: Partial<Record<string, StudentFacingLanguageRole>> = {
  body_text: "story_text",
  read_aloud_text: "tts_text",
  read_aloud_title: "tts_text",
  cta_label: "instruction",
  question: "question",
  statement: "question",
  picture_truth_statement: "feedback",
  prompt: "instruction",
  prompt_text: "question",
  feedback_text: "feedback",
  broken_text: "question",
  template: "question",
  hint: "hint",
  tip_text: "hint",
  label: "label",
  title: "label",
  left_column_label: "label",
  right_column_label: "label",
  character_name: "label",
  intro_text: "dialogue",
  student_response_label: "instruction",
  text: "dialogue",
  tts_text: "tts_text",
  popup_title: "label",
  popup_body: "story_text",
  start: "dialogue",
  success: "feedback",
  error: "feedback",
};

const GRAMMAR_SENSITIVE_KEYS = new Set([
  "body_text",
  "read_aloud_text",
  "question",
  "statement",
  "picture_truth_statement",
  "prompt",
  "prompt_text",
  "feedback_text",
  "broken_text",
  "template",
  "hint",
  "tip_text",
  "intro_text",
  "text",
  "tts_text",
  "popup_body",
  "start",
  "success",
  "error",
]);

const LIQUID_BREAKFAST_WORDS = ["milk", "juice", "water", "coffee", "tea"];
const UNCOUNTABLE_A1_NOUNS = [
  "bread",
  "milk",
  "juice",
  "jam",
  "cereal",
  "rice",
  "water",
  "butter",
  "cheese",
  "sugar",
  "salt",
  "coffee",
  "tea",
  "honey",
  "soup",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([(\[{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .trim();
}

function shouldInspectGrammar(path: string): boolean {
  const key = path.split(".").pop()?.replace(/\[\d+\]$/, "") ?? "";
  return GRAMMAR_SENSITIVE_KEYS.has(key);
}

function roleForPath(path: string): StudentFacingLanguageRole | null {
  if (/\.(word_bank|hint_decoy_words)\[\d+\]$/.test(path)) {
    return "answer_choice";
  }
  if (/\.word_chunks\[\d+\]\.text$/.test(path)) {
    return "answer_choice";
  }
  if (/\.(objects|text_options|palette)\[\d+\]\.label$/.test(path)) {
    return "answer_choice";
  }
  if (/\.objects\[\d+\]\.display\.text$/.test(path)) {
    return "answer_choice";
  }
  if (/\.containers\[\d+\]\.display\.text$/.test(path)) {
    return "label";
  }
  const key = path.split(".").pop()?.replace(/\[\d+\]$/, "") ?? "";
  if (
    key === "label" &&
    /\.(options|choices|tokens|token_bank|text_options|containers|objects)\[\d+\]\.label$/.test(path)
  ) {
    return "answer_choice";
  }
  return STUDENT_FACING_KEYS[key] ?? null;
}

function collectFromUnknown(
  value: unknown,
  path: string,
  out: StudentFacingLanguageSurface[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      if (typeof item === "string") {
        const role = roleForPath(itemPath);
        if (role && item.trim()) {
          out.push({ path: itemPath, role, text: item });
        }
        return;
      }
      collectFromUnknown(item, itemPath, out);
    });
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (typeof child === "string") {
      const role = roleForPath(childPath);
      if (role && child.trim()) {
        out.push({ path: childPath, role, text: child });
      }
      continue;
    }
    collectFromUnknown(child, childPath, out);
  }
}

export function collectStudentFacingLanguage(
  payload: ScreenPayload,
): StudentFacingLanguageSurface[] {
  const surfaces: StudentFacingLanguageSurface[] = [];
  collectFromUnknown(payload, "payload", surfaces);
  return surfaces;
}

function validateOneSurface(
  surface: StudentFacingLanguageSurface,
): StudentFacingLanguageIssue[] {
  const issues: StudentFacingLanguageIssue[] = [];
  const text = surface.text.trim();
  const lower = text.toLowerCase();

  if (/\s{2,}/.test(surface.text)) {
    issues.push({
      path: surface.path,
      severity: "warning",
      code: "double_spacing",
      message: "Student-facing text has repeated spaces.",
    });
  }

  if (/\b(?:foo|bar|lorem ipsum|todo|tbd)\b/i.test(text)) {
    issues.push({
      path: surface.path,
      severity: "error",
      code: "unclear_placeholder",
      message: "Placeholder text must not reach students.",
    });
  }

  const uncountable = UNCOUNTABLE_A1_NOUNS.join("|");
  if (
    new RegExp(`\\bthis is (?:a|an) (${uncountable})\\b`, "i").test(text) ||
    /\bthis is (?:a|an) [a-z]+s\b/i.test(text) ||
    /\bthis is (?:eggs|pancakes|noodles)\b/i.test(text)
  ) {
    issues.push({
      path: surface.path,
      severity: "error",
      code: "broken_article_noun_agreement",
      message: "The line models incorrect A1 article, number, or noun agreement.",
    });
  }

  for (const word of LIQUID_BREAKFAST_WORDS) {
    if (lower.includes(`we eat ${word} for breakfast`)) {
      issues.push({
        path: surface.path,
        severity: "error",
        code: "wrong_meal_verb",
        message: `Use "drink ${word}", not "eat ${word}", in breakfast language.`,
      });
    }
  }

  const wordCount = text.match(/[A-Za-z']+/g)?.length ?? 0;
  if (
    shouldInspectGrammar(surface.path) &&
    wordCount > 18 &&
    !surface.path.includes("broken_text")
  ) {
    issues.push({
      path: surface.path,
      severity: "warning",
      code: "too_complex_for_a1",
      message: "This line is long for Pre-A1/A1 students; consider splitting it.",
    });
  }

  if (
    shouldInspectGrammar(surface.path) &&
    wordCount >= 3 &&
    !/[.!?]$/.test(text) &&
    !text.includes("__")
  ) {
    issues.push({
      path: surface.path,
      severity: "warning",
      code: "missing_sentence_punctuation",
      message: "Sentence-like student-facing text should end with punctuation.",
    });
  }

  return issues;
}

export function validateStudentFacingTextSurface(
  surface: StudentFacingLanguageSurface,
): StudentFacingLanguageIssue[] {
  return validateOneSurface(surface);
}

export function validateStudentFacingLanguage(
  payload: ScreenPayload,
): StudentFacingLanguageIssue[] {
  return collectStudentFacingLanguage(payload).flatMap(validateOneSurface);
}

function normalizeUnknownStudentLanguage(value: unknown, path = "payload"): unknown {
  if (typeof value === "string") {
    return roleForPath(path) ? normalizeText(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeUnknownStudentLanguage(item, `${path}[${index}]`),
    );
  }
  if (!isRecord(value)) return value;

  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    next[key] = normalizeUnknownStudentLanguage(child, childPath);
  }
  return next;
}

export function normalizeStudentFacingPayload(payload: ScreenPayload): ScreenPayload {
  return normalizeUnknownStudentLanguage(payload) as ScreenPayload;
}

export function summarizeStudentFacingLanguageSurfaces(
  payloads: ScreenPayload[],
): Record<StudentFacingLanguageRole, number> {
  const summary: Record<StudentFacingLanguageRole, number> = {
    instruction: 0,
    question: 0,
    answer_choice: 0,
    feedback: 0,
    hint: 0,
    label: 0,
    story_text: 0,
    tts_text: 0,
    dialogue: 0,
  };
  for (const payload of payloads) {
    for (const surface of collectStudentFacingLanguage(payload)) {
      summary[surface.role] += 1;
    }
  }
  return summary;
}

export function studentFacingRoleForPath(path: string): StudentFacingLanguageRole | null {
  return roleForPath(path);
}
