import { interactionPayloadSchema, type InteractionSubtype } from "@/lib/lesson-schemas";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";

export const ACTIVITY_TABLE_IMPORT_MAX_ROWS = 50;

export const ACTIVITY_TABLE_IMPORT_COLUMNS = [
  "subtype",
  "question",
  "statement",
  "prompt",
  "opt_a",
  "opt_b",
  "opt_c",
  "opt_d",
  "correct",
  "template",
  "blanks_spec",
  "broken_text",
  "acceptable",
  "word_bank",
  "correct_order",
  "sentence_slots",
  "target_word",
  "accepted_words",
  "hint",
  "image_url",
  "body_text",
  "prompt_audio_url",
  "targets_json",
  "order_csv",
  "guide_tip",
  "shuffle_options",
  "hints_enabled",
] as const;

type ImportColumn = (typeof ACTIVITY_TABLE_IMPORT_COLUMNS)[number];

export type ActivityTableImportSubtype = Extract<
  InteractionSubtype,
  | "mc_quiz"
  | "true_false"
  | "drag_sentence"
  | "letter_mixup"
  | "fix_text"
  | "fill_blanks"
  | "listen_hotspot_sequence"
>;

const IMPORT_SUBTYPE_SET = new Set<string>([
  "mc_quiz",
  "true_false",
  "drag_sentence",
  "letter_mixup",
  "fix_text",
  "fill_blanks",
  "listen_hotspot_sequence",
]);

export function isActivityTableImportSubtype(value: string): value is ActivityTableImportSubtype {
  return IMPORT_SUBTYPE_SET.has(value);
}

export type ActivityTableImportRow = Record<ImportColumn, string>;

export type ActivityTableImportError = {
  rowNumber: number;
  message: string;
};

function trimValue(v: unknown): string {
  return `${v ?? ""}`.trim();
}

function splitList(raw: string): string[] {
  return raw
    .split(/[|;\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}

function parseBlanksSpec(specRaw: string): Array<{ id: string; acceptable: string[] }> {
  const spec = specRaw.trim();
  if (!spec) return [];
  return spec
    .split("|")
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((segment) => {
      const [idRaw, acceptableRaw] = segment.split(":");
      const id = trimValue(idRaw);
      const acceptable = splitList(acceptableRaw ?? "");
      return { id, acceptable };
    })
    .filter((b) => b.id.length > 0);
}

function serializeIssue(issue: unknown): string {
  const text = `${issue ?? ""}`.trim();
  return text.length > 0 ? text : "Invalid row";
}

export function parseRowsJson(raw: string): ActivityTableImportRow[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .slice(0, ACTIVITY_TABLE_IMPORT_MAX_ROWS)
    .map((row) => {
      const out = {} as ActivityTableImportRow;
      for (const col of ACTIVITY_TABLE_IMPORT_COLUMNS) {
        out[col] =
          row && typeof row === "object" ? trimValue((row as Record<string, unknown>)[col]) : "";
      }
      return out;
    })
    .filter((row) => ACTIVITY_TABLE_IMPORT_COLUMNS.some((col) => row[col].length > 0));
}

export function buildPayloadFromImportRow(
  row: ActivityTableImportRow,
  quizGroupId: string,
  quizGroupTitle: string,
  quizGroupOrder: number,
): { payload?: unknown; error?: string; subtype?: ActivityTableImportSubtype } {
  const subtypeRaw = row.subtype.trim().toLowerCase();
  if (!isActivityTableImportSubtype(subtypeRaw)) {
    return { error: `Unsupported subtype "${row.subtype || "(empty)"}"` };
  }

  const base = rawInteractionTemplateForSubtype(subtypeRaw);
  const candidate: Record<string, unknown> = {
    ...base,
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    quiz_group_order: quizGroupOrder,
  };

  const guideTip = row.guide_tip.trim();
  if (guideTip) candidate.guide = { tip_text: guideTip };

  const imageUrl = row.image_url.trim();
  if (imageUrl) candidate.image_url = imageUrl;

  const bodyText = row.body_text.trim();
  if (bodyText) candidate.body_text = bodyText;

  switch (subtypeRaw) {
    case "mc_quiz": {
      const question = row.question || row.prompt || row.statement;
      const optionsFromColumns = [row.opt_a, row.opt_b, row.opt_c, row.opt_d]
        .map((s) => s.trim())
        .filter(Boolean);
      const fallbackOptions = splitList((base as { options?: unknown[] }).options ? "" : "");
      const optionLabels = optionsFromColumns.length > 0 ? optionsFromColumns : fallbackOptions;
      const options = optionLabels.map((label, idx) => ({ id: `opt_${idx + 1}`, label }));
      if (!question.trim()) return { error: "mc_quiz requires question" };
      if (options.length === 0) return { error: "mc_quiz needs at least one option" };
      candidate.question = question.trim();
      candidate.options = options;
      const correctRaw = row.correct.trim().toLowerCase();
      const byLetter = ["a", "b", "c", "d"].indexOf(correctRaw);
      const byId = options.find((o) => o.id.toLowerCase() === correctRaw);
      const byLabel = options.find((o) => o.label.trim().toLowerCase() === correctRaw);
      const resolved =
        byLetter >= 0 && options[byLetter] ? options[byLetter]!.id
        : byId ? byId.id
        : byLabel ? byLabel.id
        : options[0]!.id;
      candidate.correct_option_id = resolved;
      const shuffle = parseBool(row.shuffle_options);
      if (shuffle != null) candidate.shuffle_options = shuffle;
      break;
    }
    case "true_false": {
      const statement = row.statement || row.question || row.prompt;
      const correct = parseBool(row.correct);
      if (!statement.trim()) return { error: "true_false requires statement" };
      if (correct == null) return { error: "true_false requires correct (true/false)" };
      candidate.statement = statement.trim();
      candidate.correct = correct;
      break;
    }
    case "drag_sentence": {
      const wordBank = splitList(row.word_bank);
      const correctOrder = splitList(row.correct_order);
      const sentenceSlots = splitList(row.sentence_slots);
      if (wordBank.length === 0) return { error: "drag_sentence requires word_bank" };
      const resolvedOrder = correctOrder.length > 0 ? correctOrder : [...wordBank];
      const resolvedSlots =
        sentenceSlots.length > 0 ? sentenceSlots : Array.from({ length: resolvedOrder.length }, () => "");
      candidate.word_bank = wordBank;
      candidate.correct_order = resolvedOrder;
      candidate.sentence_slots = resolvedSlots;
      if (row.prompt.trim()) candidate.body_text = row.prompt.trim();
      break;
    }
    case "letter_mixup": {
      const prompt = row.prompt || row.question;
      const targetWord = row.target_word.trim();
      if (!prompt.trim()) return { error: "letter_mixup requires prompt" };
      if (!targetWord) return { error: "letter_mixup requires target_word" };
      candidate.prompt = prompt.trim();
      candidate.items = [
        {
          id: "lm1",
          target_word: targetWord,
          accepted_words: splitList(row.accepted_words),
          hint: row.hint.trim() || undefined,
        },
      ];
      break;
    }
    case "fix_text": {
      const brokenText = row.broken_text.trim() || row.statement.trim() || row.prompt.trim();
      const acceptable = splitList(row.acceptable);
      if (!brokenText) return { error: "fix_text requires broken_text" };
      if (acceptable.length === 0) return { error: "fix_text requires acceptable answers" };
      candidate.broken_text = brokenText;
      candidate.acceptable = acceptable;
      const hintsEnabled = parseBool(row.hints_enabled);
      if (hintsEnabled != null) candidate.hints_enabled = hintsEnabled;
      break;
    }
    case "fill_blanks": {
      const template = row.template.trim();
      const blanks = parseBlanksSpec(row.blanks_spec);
      if (!template) return { error: "fill_blanks requires template" };
      if (blanks.length === 0) return { error: "fill_blanks requires blanks_spec (e.g. 1:cat,dog|2:mat)" };
      candidate.template = template;
      candidate.blanks = blanks;
      break;
    }
    case "listen_hotspot_sequence": {
      const promptAudioUrl = row.prompt_audio_url.trim();
      const targetsJson = row.targets_json.trim();
      if (!promptAudioUrl) return { error: "listen_hotspot_sequence requires prompt_audio_url" };
      if (!targetsJson) return { error: "listen_hotspot_sequence requires targets_json" };
      const parsedTargets = JSON.parse(targetsJson);
      if (!Array.isArray(parsedTargets) || parsedTargets.length === 0) {
        return { error: "listen_hotspot_sequence targets_json must be a non-empty JSON array" };
      }
      candidate.prompt_audio_url = promptAudioUrl;
      candidate.targets = parsedTargets;
      const order = splitList(row.order_csv);
      candidate.order =
        order.length > 0 ? order : parsedTargets.map((t) => trimValue((t as { id?: unknown }).id)).filter(Boolean);
      break;
    }
  }

  const parsed = interactionPayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: serializeIssue(parsed.error.issues[0]?.message) };
  }
  return { payload: parsed.data, subtype: subtypeRaw };
}
