import type {
  VerbFormColumn,
  VerbTableColumnDef,
  VerbTableDocument,
  VerbTableForms,
  VerbTablePlayable,
  VerbTableRow,
} from "@/lib/verb-table/types";
import {
  DEFAULT_VERB_TABLE_COLUMNS,
  DEFAULT_VERB_TABLE_INSTRUCTIONS,
  VERB_FORM_COLUMNS,
  VERB_TABLE_KIND,
} from "@/lib/verb-table/types";

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function isVerbFormColumn(value: unknown): value is VerbFormColumn {
  return typeof value === "string" && (VERB_FORM_COLUMNS as readonly string[]).includes(value);
}

function parseForms(raw: unknown, rowIndex: number): VerbTableForms {
  const forms = assertRecord(raw, `rows[${rowIndex}].forms`);
  return {
    base: assertString(forms.base, `rows[${rowIndex}].forms.base`),
    past: assertString(forms.past, `rows[${rowIndex}].forms.past`),
    participle: assertString(forms.participle, `rows[${rowIndex}].forms.participle`),
  };
}

function parseMissing(raw: unknown, rowIndex: number): VerbFormColumn[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 2) {
    throw new Error(`rows[${rowIndex}].missing needs 1–2 columns.`);
  }
  const missing: VerbFormColumn[] = [];
  for (const [index, value] of raw.entries()) {
    if (!isVerbFormColumn(value)) {
      throw new Error(`rows[${rowIndex}].missing[${index}] is invalid.`);
    }
    if (!missing.includes(value)) missing.push(value);
  }
  if (missing.length < 1) {
    throw new Error(`rows[${rowIndex}].missing needs at least one column.`);
  }
  return missing;
}

function parseRow(raw: unknown, index: number): VerbTableRow {
  const row = assertRecord(raw, `rows[${index}]`);
  return {
    id: assertString(row.id, `rows[${index}].id`),
    forms: parseForms(row.forms, index),
    missing: parseMissing(row.missing, index),
  };
}

function parseColumns(raw: unknown): VerbTableColumnDef[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return DEFAULT_VERB_TABLE_COLUMNS.map((column) => ({ ...column }));
  }
  const columns: VerbTableColumnDef[] = [];
  for (const [index, value] of raw.entries()) {
    const column = assertRecord(value, `columns[${index}]`);
    if (!isVerbFormColumn(column.id)) {
      throw new Error(`columns[${index}].id is invalid.`);
    }
    columns.push({
      id: column.id,
      label: assertString(column.label, `columns[${index}].label`),
    });
  }
  for (const id of VERB_FORM_COLUMNS) {
    if (!columns.some((column) => column.id === id)) {
      throw new Error(`columns must include ${id}.`);
    }
  }
  return columns;
}

/** Validate a verb table authoring document (flexible row count ≥ 1). */
export function validateVerbTableDocument(raw: unknown): VerbTableDocument {
  const doc = assertRecord(raw, "verb table document");
  if (doc.version !== 1) {
    throw new Error("verb table document.version must be 1.");
  }
  if (doc.kind !== VERB_TABLE_KIND) {
    throw new Error(`verb table document.kind must be "${VERB_TABLE_KIND}".`);
  }
  if (!Array.isArray(doc.rows) || doc.rows.length < 1) {
    throw new Error("rows needs at least one verb table row.");
  }

  const rows = doc.rows.map((row, index) => parseRow(row, index));
  const cefr =
    typeof doc.cefr === "string" && doc.cefr.trim() ? doc.cefr.trim() : undefined;

  return {
    version: 1,
    kind: VERB_TABLE_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_VERB_TABLE_INSTRUCTIONS,
    columns: parseColumns(doc.columns),
    rows,
    ...(cefr ? { cefr } : {}),
  };
}

export function toVerbTablePlayable(document: VerbTableDocument): VerbTablePlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    columns: document.columns.map((column) => ({ ...column })),
    rows: document.rows.map((row) => ({
      id: row.id,
      forms: { ...row.forms },
      missing: [...row.missing],
    })),
  };
}

/** Stub pack so studio_activities.pack stays a non-null object. */
export function verbTableStubPack(
  document: VerbTableDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "verb-table-pack",
    id: document.id,
    title: document.title,
    row_count: document.rows.length,
    document,
  };
}

/** Resolve a playable document from bank pack and/or authoring. */
export function resolveVerbTableFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): VerbTableDocument {
  if (input.authoring) {
    try {
      return validateVerbTableDocument(input.authoring);
    } catch {
      /* Fall through to pack.document. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "verb table pack");
  if (pack.document) {
    return validateVerbTableDocument(pack.document);
  }
  return validateVerbTableDocument(pack);
}
