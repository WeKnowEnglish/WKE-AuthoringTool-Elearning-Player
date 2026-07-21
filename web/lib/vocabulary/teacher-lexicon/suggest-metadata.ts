import { z } from "zod";
import type {
  TeacherLexiconEntry,
  TeacherLexiconEntryKind,
  TeacherLexiconPos,
} from "./types";

const POS_VALUES = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "determiner",
  "preposition",
  "conjunction",
  "number",
  "interjection",
  "modal",
  "particle",
  "unspecified",
] as const;

const KIND_VALUES = ["word", "phrase", "slang", "name", "other"] as const;

const STAGE_VALUES = [
  "PRE_A1_1",
  "PRE_A1_2",
  "A1_1",
  "A1_2",
  "A2_1",
  "A2_2",
] as const;

export const teacherLexiconSuggestionSchema = z.object({
  pos: z.enum(POS_VALUES).nullable().optional(),
  entryKind: z.enum(KIND_VALUES).nullable().optional(),
  primaryStage: z.enum(STAGE_VALUES).nullable().optional(),
  primaryTopic: z.string().max(64).nullable().optional(),
  learnerDefinitionEn: z.string().max(400).nullable().optional(),
  learnerMeaningVi: z.string().max(400).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  informal: z.boolean().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  warnings: z.array(z.string().max(200)).max(8).optional(),
});

export type TeacherLexiconSuggestion = {
  pos: TeacherLexiconPos | null;
  entryKind: TeacherLexiconEntryKind | null;
  primaryStage: string | null;
  primaryTopic: string | null;
  learnerDefinitionEn: string | null;
  learnerMeaningVi: string | null;
  note: string | null;
  informal: boolean;
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

function cleanText(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse + sanitize model JSON into a stable suggestion object. */
export function parseTeacherLexiconSuggestion(raw: unknown): TeacherLexiconSuggestion {
  const parsed = teacherLexiconSuggestionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Could not parse AI suggestion.");
  }
  const data = parsed.data;
  const informal = Boolean(data.informal) || data.entryKind === "slang";
  let note = cleanText(data.note, 500);
  if (informal && note && !/informal/i.test(note)) {
    note = `Informal. ${note}`.slice(0, 500);
  } else if (informal && !note) {
    note = "Informal.";
  }

  return {
    pos: (data.pos ?? null) as TeacherLexiconPos | null,
    entryKind: (data.entryKind ?? null) as TeacherLexiconEntryKind | null,
    primaryStage: data.primaryStage ?? null,
    primaryTopic: cleanText(data.primaryTopic, 64),
    learnerDefinitionEn: cleanText(data.learnerDefinitionEn, 400),
    learnerMeaningVi: cleanText(data.learnerMeaningVi, 400),
    note,
    informal,
    confidence: data.confidence ?? "medium",
    warnings: (data.warnings ?? []).map((w) => w.trim()).filter(Boolean).slice(0, 8),
  };
}

export function parseTeacherLexiconSuggestionJson(text: string): TeacherLexiconSuggestion {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
  return parseTeacherLexiconSuggestion(raw);
}

export function buildSuggestMetadataPrompt(input: {
  surface: string;
  entryKind: TeacherLexiconEntryKind;
  pos: TeacherLexiconPos | null;
  primaryStage: string | null;
  primaryTopic: string | null;
  note: string | null;
  learnerDefinitionEn: string | null;
  learnerMeaningVi: string | null;
}): string {
  return [
    "You help ESL Primary teachers enrich a custom dictionary entry for Vietnamese learners of English.",
    "Return ONLY a JSON object with these keys:",
    'pos (one of: noun, verb, adjective, adverb, pronoun, determiner, preposition, conjunction, number, interjection, modal, particle, unspecified, or null),',
    "entryKind (word | phrase | slang | name | other),",
    "primaryStage (PRE_A1_1 | PRE_A1_2 | A1_1 | A1_2 | A2_1 | A2_2 | null) — a rough teaching stage guess, not a certified CEFR claim,",
    "primaryTopic (short snake_or_words topic like animals, school, feelings, or null),",
    "learnerDefinitionEn (short learner-friendly English meaning, max ~20 words, or null),",
    "learnerMeaningVi (short Vietnamese gloss, or null),",
    "note (optional teacher note; mention informal for slang),",
    "informal (boolean),",
    'confidence ("high" | "medium" | "low"),',
    "warnings (string array; empty if none).",
    "",
    "Rules:",
    "- Prefer simple Primary-classroom language.",
    "- Do not invent long encyclopedia definitions.",
    "- If slang/informal, set entryKind to slang or informal true and note Informal.",
    "- primaryStage is a candidate guess only.",
    "- Keep Vietnamese natural and short.",
    "- If unsure, lower confidence and add a warning.",
    "",
    "Current entry:",
    JSON.stringify(
      {
        surface: input.surface,
        entryKind: input.entryKind,
        pos: input.pos,
        primaryStage: input.primaryStage,
        primaryTopic: input.primaryTopic,
        note: input.note,
        learnerDefinitionEn: input.learnerDefinitionEn,
        learnerMeaningVi: input.learnerMeaningVi,
      },
      null,
      2,
    ),
  ].join("\n");
}

export type SuggestionApplyMode = "all" | "empty_only";

export type SuggestionApplyPatch = {
  pos?: TeacherLexiconPos | null;
  entryKind?: TeacherLexiconEntryKind | null;
  primaryStage?: string | null;
  primaryTopic?: string | null;
  learnerDefinitionEn?: string | null;
  learnerMeaningVi?: string | null;
  note?: string | null;
};

function isEmptyField(value: string | null | undefined): boolean {
  return !value || !String(value).trim();
}

/** Build an update patch from a suggestion, optionally only filling empty fields. */
export function suggestionToUpdatePatch(
  entry: Pick<
    TeacherLexiconEntry,
    | "pos"
    | "entryKind"
    | "primaryStage"
    | "primaryTopic"
    | "learnerDefinitionEn"
    | "learnerMeaningVi"
    | "note"
  >,
  suggestion: TeacherLexiconSuggestion,
  mode: SuggestionApplyMode,
): SuggestionApplyPatch {
  const patch: SuggestionApplyPatch = {};
  const fill = (current: string | null | undefined, next: string | null | undefined) => {
    if (next === undefined || next === null) return false;
    if (mode === "all") return true;
    return isEmptyField(current);
  };

  if (suggestion.pos && (mode === "all" || !entry.pos || entry.pos === "unspecified")) {
    patch.pos = suggestion.pos;
  }
  if (suggestion.entryKind && (mode === "all" || entry.entryKind === "word")) {
    // Only overwrite kind on "all", or when still default word and suggestion differs.
    if (mode === "all" || (entry.entryKind === "word" && suggestion.entryKind !== "word")) {
      patch.entryKind = suggestion.entryKind;
    }
  }
  if (suggestion.primaryStage && fill(entry.primaryStage, suggestion.primaryStage)) {
    patch.primaryStage = suggestion.primaryStage;
  }
  if (suggestion.primaryTopic && fill(entry.primaryTopic, suggestion.primaryTopic)) {
    patch.primaryTopic = suggestion.primaryTopic;
  }
  if (
    suggestion.learnerDefinitionEn &&
    fill(entry.learnerDefinitionEn, suggestion.learnerDefinitionEn)
  ) {
    patch.learnerDefinitionEn = suggestion.learnerDefinitionEn;
  }
  if (suggestion.learnerMeaningVi && fill(entry.learnerMeaningVi, suggestion.learnerMeaningVi)) {
    patch.learnerMeaningVi = suggestion.learnerMeaningVi;
  }
  if (suggestion.note && fill(entry.note, suggestion.note)) {
    patch.note = suggestion.note;
  }

  return patch;
}

export function summarizeSuggestion(suggestion: TeacherLexiconSuggestion): string {
  const bits = [
    suggestion.pos && suggestion.pos !== "unspecified" ? suggestion.pos : null,
    suggestion.entryKind && suggestion.entryKind !== "word" ? suggestion.entryKind : null,
    suggestion.primaryStage,
    suggestion.primaryTopic,
    suggestion.learnerDefinitionEn,
    suggestion.learnerMeaningVi,
  ].filter(Boolean);
  return bits.join(" · ");
}
