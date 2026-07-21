"use client";

import type { PackQuizTfSheetRow } from "@/lib/vocabulary/pack-quiz";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

type RowPatch = Partial<
  Pick<PackQuizTfSheetRow, "statement" | "correct" | "promptImageUrl" | "truthStatement">
>;

type Props = {
  rows: readonly PackQuizTfSheetRow[];
  readOnly?: boolean;
  onChangeRow?: (id: string, patch: RowPatch) => void;
  onDeleteRow?: (id: string) => void;
};

const cellInputClass =
  "w-full min-w-[6rem] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-neutral-900 outline-none hover:border-neutral-300 focus:border-neutral-500 focus:bg-white";

function PromptImageThumb({ url, alt }: { url: string; alt: string }) {
  const src = url.trim();
  if (!src) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-neutral-300 bg-neutral-50 text-[10px] text-neutral-400">
        —
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- teacher-pasted / library URLs
    <img
      src={src}
      alt={alt}
      className="h-12 w-12 shrink-0 rounded border border-neutral-200 object-contain bg-white"
    />
  );
}

export function PackQuizTfSheetTable({ rows, readOnly = true, onChangeRow, onDeleteRow }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-600">This quiz has no questions yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-[52rem] w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-neutral-100 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          <tr>
            <th className="border-b border-neutral-200 px-2 py-2 w-10">#</th>
            <th className="border-b border-neutral-200 px-2 py-2 min-w-[14rem]">Statement</th>
            <th className="border-b border-neutral-200 px-2 py-2 w-28">Answer</th>
            <th className="border-b border-neutral-200 px-2 py-2 min-w-[14rem]">Prompt image</th>
            <th className="border-b border-neutral-200 px-2 py-2 min-w-[12rem]">Truth statement</th>
            {!readOnly ? (
              <th className="border-b border-neutral-200 px-2 py-2 w-16"> </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="align-top odd:bg-white even:bg-neutral-50/60">
              <td className="border-b border-neutral-100 px-2 py-2 text-xs text-neutral-500">
                {index + 1}
              </td>
              <td className="border-b border-neutral-100 px-2 py-2">
                {readOnly ? (
                  <span className="whitespace-pre-wrap text-neutral-900">{row.statement}</span>
                ) : (
                  <textarea
                    className={`${cellInputClass} min-h-[2.5rem] resize-y`}
                    rows={2}
                    value={row.statement}
                    aria-label={`Statement for question ${index + 1}`}
                    onChange={(e) => onChangeRow?.(row.id, { statement: e.target.value })}
                  />
                )}
              </td>
              <td className="border-b border-neutral-100 px-2 py-2">
                {readOnly ? (
                  <span
                    className={
                      row.correct ? "font-medium text-emerald-900" : "font-medium text-red-800"
                    }
                  >
                    {row.correct ? "True" : "False"}
                  </span>
                ) : (
                  <select
                    className="w-full rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-900"
                    value={row.correct ? "true" : "false"}
                    aria-label={`Answer for question ${index + 1}`}
                    onChange={(e) =>
                      onChangeRow?.(row.id, { correct: e.target.value === "true" })
                    }
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                )}
              </td>
              <td className="border-b border-neutral-100 px-2 py-2">
                {readOnly ? (
                  <div className="flex items-start gap-2">
                    <PromptImageThumb
                      url={row.promptImageUrl}
                      alt={row.promptImageUrl ? `Prompt image ${index + 1}` : ""}
                    />
                    <span className="min-w-0 break-all text-xs text-neutral-600">
                      {row.promptImageUrl.trim() || "—"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <PromptImageThumb
                      url={row.promptImageUrl}
                      alt={row.promptImageUrl ? `Prompt image ${index + 1}` : ""}
                    />
                    <div className="min-w-0 flex-1">
                      <MediaUrlControls
                        label="Image"
                        value={row.promptImageUrl}
                        onChange={(url) =>
                          onChangeRow?.(row.id, { promptImageUrl: url })
                        }
                        compact
                        hidePreview
                      />
                    </div>
                  </div>
                )}
              </td>
              <td className="border-b border-neutral-100 px-2 py-2">
                {readOnly ? (
                  <span className="whitespace-pre-wrap text-neutral-700">
                    {row.truthStatement.trim() || "—"}
                  </span>
                ) : (
                  <textarea
                    className={`${cellInputClass} min-h-[2.5rem] resize-y`}
                    rows={2}
                    value={row.truthStatement}
                    aria-label={`Truth statement for question ${index + 1}`}
                    onChange={(e) =>
                      onChangeRow?.(row.id, { truthStatement: e.target.value })
                    }
                  />
                )}
              </td>
              {!readOnly ? (
                <td className="border-b border-neutral-100 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onDeleteRow?.(row.id)}
                    disabled={rows.length <= 1}
                    title={rows.length <= 1 ? "Keep at least one question" : "Delete question"}
                    className="text-xs font-semibold text-red-700 underline hover:text-red-900 disabled:opacity-40"
                  >
                    Del
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
