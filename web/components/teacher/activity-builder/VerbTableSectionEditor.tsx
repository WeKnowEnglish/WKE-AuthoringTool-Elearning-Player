"use client";

import {
  parseVerbTableAuthoringSection,
  verbTableSectionValidationIssues,
  VERB_FORM_COLUMNS,
  type VerbTableSection,
} from "@/lib/homework-templates/homework-template-one";
import type { VerbFormColumn } from "@/lib/verb-table/types";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  section: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function emptyRow(): VerbTableSection["rows"][number] {
  return {
    id: `verb-row-${crypto.randomUUID().slice(0, 8)}`,
    forms: { base: "", past: "", participle: "" },
    missing: ["past"],
  };
}

function toggleMissing(
  missing: VerbFormColumn[],
  column: VerbFormColumn,
): VerbFormColumn[] {
  const has = missing.includes(column);
  if (has) {
    if (missing.length <= 1) return missing;
    return missing.filter((item) => item !== column);
  }
  if (missing.length >= 2) return missing;
  return [...missing, column];
}

export function VerbTableSectionEditor({ section, onChange }: Props) {
  const parsed = parseVerbTableAuthoringSection(section);
  const issues = verbTableSectionValidationIssues(section);
  const [rowIndex, setRowIndex] = useAuthoringItemIndex(
    parsed?.rows.length ?? 0,
    parsed?.id,
  );

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
        This verb table section is invalid and can’t be edited until Reset from
        template.
        {issues[0] ? (
          <p className="mt-1 font-medium opacity-80">{issues[0]}</p>
        ) : null}
      </div>
    );
  }

  const patch = (updater: (prev: VerbTableSection) => VerbTableSection) => {
    onChange(updater(parsed) as unknown as Record<string, unknown>);
  };

  const row = parsed.rows[rowIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Verb table content
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
          Edit column labels, then one row at a time (1–2 blanks per row; min 4,
          max 12).
        </p>
      </div>

      <div className="space-y-2">
        {parsed.columns.map((column, columnIndex) => (
          <label key={column.id} className="block text-[11px] font-bold text-stone-700">
            Column: {column.id}
            <input
              value={column.label}
              onChange={(event) => {
                const label = event.target.value;
                patch((prev) => ({
                  ...prev,
                  columns: prev.columns.map((col, index) =>
                    index === columnIndex ? { ...col, label } : col,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
            />
          </label>
        ))}
      </div>

      <AuthoringItemPager
        count={parsed.rows.length}
        index={rowIndex}
        onIndexChange={setRowIndex}
        label="Row"
        minCount={4}
        maxCount={12}
        onAdd={() => {
          patch((prev) => ({
            ...prev,
            rows: [...prev.rows, emptyRow()],
          }));
          setRowIndex(parsed.rows.length);
        }}
        onRemove={() => {
          if (!row) return;
          patch((prev) => ({
            ...prev,
            rows: prev.rows.filter((item) => item.id !== row.id),
          }));
        }}
      >
        {row ? (
          <div className="grid gap-2">
            {VERB_FORM_COLUMNS.map((columnId) => (
              <label
                key={columnId}
                className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px] font-bold text-stone-700"
              >
                <span className="min-w-0">
                  <span className="capitalize">{columnId}</span>
                  <input
                    value={row.forms[columnId]}
                    onChange={(event) => {
                      const value = event.target.value;
                      patch((prev) => ({
                        ...prev,
                        rows: prev.rows.map((item, index) =>
                          index === rowIndex
                            ? {
                                ...item,
                                forms: { ...item.forms, [columnId]: value },
                              }
                            : item,
                        ),
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
                  />
                </span>
                <span className="pt-5">
                  <label className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600">
                    <input
                      type="checkbox"
                      checked={row.missing.includes(columnId)}
                      onChange={() =>
                        patch((prev) => ({
                          ...prev,
                          rows: prev.rows.map((item, index) =>
                            index === rowIndex
                              ? {
                                  ...item,
                                  missing: toggleMissing(
                                    item.missing as VerbFormColumn[],
                                    columnId,
                                  ),
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                    Blank
                  </label>
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </AuthoringItemPager>

      {issues.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">
          Fix before assign:
          <ul className="mt-1 list-disc pl-4">
            {issues.slice(0, 4).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-emerald-700">
          Verb table looks valid for freeze.
        </p>
      )}
    </div>
  );
}
