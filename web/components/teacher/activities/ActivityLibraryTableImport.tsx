"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ACTIVITY_TABLE_IMPORT_COLUMNS,
  ACTIVITY_TABLE_IMPORT_MAX_ROWS,
} from "@/lib/activity-table-import";
import {
  createActivityLibraryItemFromTable,
} from "@/lib/actions/teacher";

type ImportColumn = (typeof ACTIVITY_TABLE_IMPORT_COLUMNS)[number];
type SupportedSubtype =
  | "mc_quiz"
  | "true_false"
  | "drag_sentence"
  | "letter_mixup"
  | "fix_text"
  | "fill_blanks"
  | "listen_hotspot_sequence";

const COLUMN_LABELS: Record<(typeof ACTIVITY_TABLE_IMPORT_COLUMNS)[number], string> = {
  subtype: "subtype",
  question: "question",
  statement: "statement",
  prompt: "prompt",
  opt_a: "opt_a",
  opt_b: "opt_b",
  opt_c: "opt_c",
  opt_d: "opt_d",
  correct: "correct",
  template: "template",
  blanks_spec: "blanks_spec",
  broken_text: "broken_text",
  acceptable: "acceptable",
  word_bank: "word_bank",
  correct_order: "correct_order",
  sentence_slots: "sentence_slots",
  target_word: "target_word",
  accepted_words: "accepted_words",
  hint: "hint",
  image_url: "image_url",
  body_text: "body_text",
  prompt_audio_url: "prompt_audio_url",
  targets_json: "targets_json",
  order_csv: "order_csv",
  guide_tip: "guide_tip",
  shuffle_options: "shuffle_options",
  hints_enabled: "hints_enabled",
};

const SUBTYPE_REQUIRED_COLUMNS: Record<SupportedSubtype, ImportColumn[]> = {
  mc_quiz: ["question", "opt_a", "opt_b", "correct"],
  true_false: ["statement", "correct"],
  drag_sentence: ["word_bank", "correct_order"],
  letter_mixup: ["prompt", "target_word"],
  fix_text: ["broken_text", "acceptable"],
  fill_blanks: ["template", "blanks_spec"],
  listen_hotspot_sequence: ["image_url", "prompt_audio_url", "targets_json"],
};

const SUBTYPE_SAMPLE_VALUES: Record<SupportedSubtype, Partial<Record<ImportColumn, string>>> = {
  mc_quiz: {
    subtype: "mc_quiz",
    question: "Which sentence is correct?",
    opt_a: "He go to school.",
    opt_b: "He goes to school.",
    opt_c: "He going to school.",
    correct: "b",
  },
  true_false: {
    subtype: "true_false",
    statement: "The sun rises in the east.",
    correct: "true",
  },
  drag_sentence: {
    subtype: "drag_sentence",
    prompt: "Arrange the sentence.",
    word_bank: "I|like|apples",
    correct_order: "I|like|apples",
    sentence_slots: "| | ",
  },
  letter_mixup: {
    subtype: "letter_mixup",
    prompt: "Unscramble the letters.",
    target_word: "school",
    accepted_words: "School",
  },
  fix_text: {
    subtype: "fix_text",
    broken_text: "She go to school every day.",
    acceptable: "She goes to school every day.",
    hints_enabled: "true",
  },
  fill_blanks: {
    subtype: "fill_blanks",
    template: "I see a __1__.",
    blanks_spec: "1:cat,dog",
  },
  listen_hotspot_sequence: {
    subtype: "listen_hotspot_sequence",
    image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Listen+and+tap",
    prompt_audio_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
    targets_json:
      '[{"id":"t1","x_percent":12,"y_percent":20,"w_percent":20,"h_percent":24,"label":"First"}]',
    order_csv: "t1",
  },
};

function makeEmptyRows(rowCount: number): string[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: ACTIVITY_TABLE_IMPORT_COLUMNS.length }, () => ""),
  );
}

function parseClipboardGrid(raw: string): string[][] {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line, idx, all) => line.length > 0 || idx < all.length - 1)
    .map((line) => line.split("\t"));
}

export function ActivityLibraryTableImport() {
  const [rows, setRows] = useState<string[][]>(() => makeEmptyRows(12));
  const [focusCell, setFocusCell] = useState({ row: 0, col: 0 });
  const [sampleSubtype, setSampleSubtype] = useState<SupportedSubtype>("mc_quiz");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [state, formAction, pending] = useActionState(
    createActivityLibraryItemFromTable,
    { status: "idle" as const },
  );

  const rowObjectsJson = useMemo(() => {
    const out: Array<Record<string, string>> = [];
    for (const row of rows) {
      const asObj: Record<string, string> = {};
      let hasValue = false;
      ACTIVITY_TABLE_IMPORT_COLUMNS.forEach((col, idx) => {
        const value = (row[idx] ?? "").trim();
        asObj[col] = value;
        if (value) hasValue = true;
      });
      if (hasValue) out.push(asObj);
    }
    return JSON.stringify(out);
  }, [rows]);

  const nonEmptyRowIndexes = useMemo(() => {
    const out: number[] = [];
    rows.forEach((row, idx) => {
      if (row.some((cell) => cell.trim().length > 0)) out.push(idx);
    });
    return out;
  }, [rows]);

  const localValidation = useMemo(() => {
    const missingByRow = new Map<number, Set<ImportColumn>>();
    const rowErrors: Array<{ row: number; message: string }> = [];
    for (const rowIdx of nonEmptyRowIndexes) {
      const row = rows[rowIdx]!;
      const subtypeRaw = (row[ACTIVITY_TABLE_IMPORT_COLUMNS.indexOf("subtype")] ?? "")
        .trim()
        .toLowerCase();
      if (!subtypeRaw) {
        rowErrors.push({ row: rowIdx + 1, message: "Missing subtype" });
        continue;
      }
      if (!(subtypeRaw in SUBTYPE_REQUIRED_COLUMNS)) {
        rowErrors.push({ row: rowIdx + 1, message: `Unsupported subtype "${subtypeRaw}"` });
        continue;
      }
      const subtype = subtypeRaw as SupportedSubtype;
      const requiredCols = SUBTYPE_REQUIRED_COLUMNS[subtype];
      const missing = new Set<ImportColumn>();
      requiredCols.forEach((col) => {
        const colIdx = ACTIVITY_TABLE_IMPORT_COLUMNS.indexOf(col);
        if (!(row[colIdx] ?? "").trim()) missing.add(col);
      });
      if (missing.size > 0) {
        missingByRow.set(rowIdx, missing);
        rowErrors.push({
          row: rowIdx + 1,
          message: `Missing required fields for ${subtype}: ${Array.from(missing).join(", ")}`,
        });
      }
    }
    return { missingByRow, rowErrors };
  }, [rows, nonEmptyRowIndexes]);

  const pasteIntoGrid = (startRow: number, startCol: number, text: string) => {
    const grid = parseClipboardGrid(text);
    if (grid.length === 0) return;
    setRows((prev) => {
      const next = [...prev.map((r) => [...r])];
      for (let r = 0; r < grid.length; r += 1) {
        const targetRow = startRow + r;
        if (targetRow >= ACTIVITY_TABLE_IMPORT_MAX_ROWS) break;
        while (next.length <= targetRow) {
          next.push(Array.from({ length: ACTIVITY_TABLE_IMPORT_COLUMNS.length }, () => ""));
        }
        for (let c = 0; c < grid[r]!.length; c += 1) {
          const targetCol = startCol + c;
          if (targetCol >= ACTIVITY_TABLE_IMPORT_COLUMNS.length) break;
          next[targetRow]![targetCol] = grid[r]![c] ?? "";
        }
      }
      return next.slice(0, ACTIVITY_TABLE_IMPORT_MAX_ROWS);
    });
  };

  const canSubmit = title.trim().length > 0 && nonEmptyRowIndexes.length > 0 && !pending;

  return (
    <section className="rounded-lg border border-sky-300 bg-sky-50/60 p-4">
      <h2 className="text-sm font-bold text-sky-950">Spreadsheet Import (up to 50 rows)</h2>
      <p className="mt-1 text-xs text-sky-900/90">
        Paste table data directly from Sheets/Excel. One row is one question.
      </p>
      <p className="mt-1 text-[11px] text-sky-900/80">
        Supported subtype values: <span className="font-mono">mc_quiz, true_false, drag_sentence, letter_mixup, fix_text, fill_blanks, listen_hotspot_sequence</span>
      </p>

      <form action={formAction} className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-sm">
            Title
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
              placeholder="Quiz title"
            />
          </label>
          <label className="text-sm">
            Level
            <input
              name="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
              placeholder="A1"
            />
          </label>
          <label className="text-sm">
            Topic
            <input
              name="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
              placeholder="Food"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded border border-sky-200 bg-white px-2 py-2 text-xs">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700">Insert sample row</span>
            <select
              value={sampleSubtype}
              onChange={(e) => setSampleSubtype(e.target.value as SupportedSubtype)}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              <option value="mc_quiz">mc_quiz</option>
              <option value="true_false">true_false</option>
              <option value="drag_sentence">drag_sentence</option>
              <option value="letter_mixup">letter_mixup</option>
              <option value="fix_text">fix_text</option>
              <option value="fill_blanks">fill_blanks</option>
              <option value="listen_hotspot_sequence">listen_hotspot_sequence</option>
            </select>
          </label>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-2 py-1 font-semibold"
            onClick={() => {
              const targetRow = Math.max(0, Math.min(focusCell.row, ACTIVITY_TABLE_IMPORT_MAX_ROWS - 1));
              const sample = SUBTYPE_SAMPLE_VALUES[sampleSubtype];
              setRows((prev) => {
                const next = [...prev.map((r) => [...r])];
                while (next.length <= targetRow) {
                  next.push(Array.from({ length: ACTIVITY_TABLE_IMPORT_COLUMNS.length }, () => ""));
                }
                ACTIVITY_TABLE_IMPORT_COLUMNS.forEach((col, idx) => {
                  next[targetRow]![idx] = sample[col] ?? "";
                });
                return next.slice(0, ACTIVITY_TABLE_IMPORT_MAX_ROWS);
              });
            }}
            disabled={pending}
          >
            Fill active row
          </button>
          <span className="text-neutral-500">Active row: {focusCell.row + 1}</span>
        </div>

        <div className="overflow-auto rounded border border-sky-200 bg-white">
          <table className="min-w-[1200px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r bg-neutral-100 px-2 py-1 text-left">#</th>
                {ACTIVITY_TABLE_IMPORT_COLUMNS.map((col) => (
                  <th key={col} className="border-b border-r bg-neutral-100 px-2 py-1 text-left font-semibold">
                    {COLUMN_LABELS[col]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={`row-${rowIdx}`}>
                  <td className="sticky left-0 z-10 border-r border-b bg-neutral-50 px-2 py-1 text-[11px] text-neutral-500">
                    {rowIdx + 1}
                  </td>
                  {ACTIVITY_TABLE_IMPORT_COLUMNS.map((col, colIdx) => (
                    <td key={`${rowIdx}-${col}`} className="border-r border-b p-0">
                      <input
                        className={`h-8 w-full min-w-[8rem] border-0 px-2 py-1 text-xs outline-none focus:bg-sky-50 ${
                          localValidation.missingByRow.get(rowIdx)?.has(col)
                            ? "bg-rose-50"
                            : ""
                        }`}
                        value={row[colIdx] ?? ""}
                        onFocus={() => setFocusCell({ row: rowIdx, col: colIdx })}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text/plain");
                          if (!text.includes("\t") && !text.includes("\n")) return;
                          e.preventDefault();
                          pasteIntoGrid(rowIdx, colIdx, text);
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, i) => {
                              if (i !== rowIdx) return r;
                              const next = [...r];
                              next[colIdx] = v;
                              return next;
                            }),
                          );
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <input type="hidden" name="table_rows_json" value={rowObjectsJson} />
        <input type="hidden" name="shuffle_questions" value="0" />
        <input type="hidden" name="shuffle_answer_options_each_replay" value="1" />
        <input type="hidden" name="auto_advance_on_pass_default" value="0" />

        <div className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
          Rows filled: {nonEmptyRowIndexes.length} / {ACTIVITY_TABLE_IMPORT_MAX_ROWS}
          {localValidation.rowErrors.length > 0 ? (
            <span className="ml-2 text-rose-700">
              · Local checks found {localValidation.rowErrors.length} issue
              {localValidation.rowErrors.length === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="ml-2 text-emerald-700">· Local checks pass</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold"
            onClick={() => setRows(makeEmptyRows(12))}
            disabled={pending}
          >
            Clear table
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              setRows((prev) => {
                if (prev.length >= ACTIVITY_TABLE_IMPORT_MAX_ROWS) return prev;
                const next = [...prev];
                next.push(Array.from({ length: ACTIVITY_TABLE_IMPORT_COLUMNS.length }, () => ""));
                return next;
              });
            }}
            disabled={pending || rows.length >= ACTIVITY_TABLE_IMPORT_MAX_ROWS}
          >
            Add row ({rows.length}/{ACTIVITY_TABLE_IMPORT_MAX_ROWS})
          </button>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!canSubmit}
          >
            {pending ? "Saving..." : "Save imported activity"}
          </button>
          <span className="text-xs text-neutral-500">
            Active cell: r{focusCell.row + 1} c{focusCell.col + 1}
          </span>
        </div>

        {state.status === "success" ? (
          <p className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
            {state.message} Added: {state.insertedCount ?? 0}, skipped: {state.skippedCount ?? 0}.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-900">
            {state.message}
          </p>
        ) : null}
        {state.rowErrors && state.rowErrors.length > 0 ? (
          <details className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            <summary className="cursor-pointer font-semibold">
              Row issues ({state.rowErrors.length})
            </summary>
            <ul className="mt-1 max-h-48 space-y-1 overflow-auto pr-2">
              {state.rowErrors.map((err) => (
                <li key={`${err.rowNumber}-${err.message}`}>Row {err.rowNumber}: {err.message}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {localValidation.rowErrors.length > 0 ? (
          <details className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-900">
            <summary className="cursor-pointer font-semibold">
              Local required-field warnings ({localValidation.rowErrors.length})
            </summary>
            <ul className="mt-1 max-h-40 space-y-1 overflow-auto pr-2">
              {localValidation.rowErrors.slice(0, 20).map((err) => (
                <li key={`${err.row}-${err.message}`}>Row {err.row}: {err.message}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </form>

      <details className="mt-3 text-xs text-neutral-700">
        <summary className="cursor-pointer font-semibold">Column reference</summary>
        <p className="mt-1">
          Required by subtype: `mc_quiz`: question + options/correct; `true_false`: statement/correct;
          `drag_sentence`: word_bank/correct_order; `letter_mixup`: prompt + target_word; `fix_text`:
          broken_text + acceptable; `fill_blanks`: template + blanks_spec (`1:cat,dog|2:mat`);
          `listen_hotspot_sequence`: image_url + prompt_audio_url + targets_json (+ optional order_csv).
        </p>
      </details>
    </section>
  );
}
