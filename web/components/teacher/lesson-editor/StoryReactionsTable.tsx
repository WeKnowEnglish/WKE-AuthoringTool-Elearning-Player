"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoryUnifiedReactionRow } from "@/lib/story-unified/schema";
import {
  collectOutputLeaves,
  reactionTriggerLabel,
  summarizeReactionBody,
} from "@/lib/story-unified/reaction-row-labels";
import {
  buildAddReactionOptions,
  defaultAddReactionMode,
  triggerIcon,
  type AddReactionMode,
} from "@/components/teacher/lesson-editor/story-reactions-table-model";

export type ReactionIssueBadge = {
  level: "error" | "warn";
  messages: string[];
};

export function reactionRowKey(row: StoryUnifiedReactionRow, idx = 0): string {
  return row.id ?? row.source_sequence_id ?? `${row.phase_id}:${row.trigger}:${idx}`;
}

type Props = {
  rows: StoryUnifiedReactionRow[];
  selectedRowKey: string | null;
  onSelectRowKey: (key: string) => void;
  onOpenRow: (row: StoryUnifiedReactionRow) => void;
  onConfigureRow: (row: StoryUnifiedReactionRow) => void;
  onAddReaction: (mode: AddReactionMode) => void;
  issueByRowKey: Map<string, ReactionIssueBadge>;
  phaseNameById: Map<string, string>;
  itemNameById: Map<string, string>;
  selectedItemId: string | null;
  selectedItemLabel: string | null;
  selectedPhaseId: string | null;
  hasAnyItems: boolean;
  hasAnyPhases: boolean;
  hasAnyTapGroupParent: boolean;
};

function badgeClass(level: "error" | "warn"): string {
  if (level === "error") return "border-red-300 bg-red-50 text-red-800";
  return "border-amber-300 bg-amber-50 text-amber-800";
}

export function StoryReactionsTable({
  rows,
  selectedRowKey,
  onSelectRowKey,
  onOpenRow,
  onConfigureRow,
  onAddReaction,
  issueByRowKey,
  phaseNameById,
  itemNameById,
  selectedItemId,
  selectedItemLabel,
  selectedPhaseId,
  hasAnyItems,
  hasAnyPhases,
  hasAnyTapGroupParent,
}: Props) {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"all" | "selected">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "selected_item">(
    selectedItemId ? "selected_item" : "all",
  );
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<AddReactionMode>(
    defaultAddReactionMode({
      selectedItemId,
      selectedPhaseId,
      hasAnyItems,
      hasAnyPhases,
    }),
  );

  const phaseOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.phase_id)))
        .map((id) => ({
          id,
          label: phaseNameById.get(id) ?? id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [rows, phaseNameById],
  );

  const addOptions = useMemo(
    () =>
      buildAddReactionOptions({
        selectedItemId,
        hasAnyItems,
        hasAnyPhases,
        hasAnyTapGroupParent,
      }),
    [selectedItemId, hasAnyItems, hasAnyPhases, hasAnyTapGroupParent],
  );

  useEffect(() => {
    if (addOptions.find((x) => x.id === addKind)?.enabled) return;
    const fallback = addOptions.find((x) => x.enabled);
    if (fallback) setAddKind(fallback.id);
  }, [addKind, addOptions]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const withMeta = rows.map((row, idx) => {
      const key = reactionRowKey(row, idx);
      const triggerText = reactionTriggerLabel(row, { phaseNameById, itemNameById });
      const outputText = summarizeReactionBody(row.reaction_body);
      return { row, idx, key, triggerText, outputText };
    });
    return withMeta
      .filter(({ row, triggerText, outputText }) => {
        if (phaseFilter === "selected" && selectedPhaseId && row.phase_id !== selectedPhaseId) {
          return false;
        }
        if (
          scopeFilter === "selected_item" &&
          selectedItemId &&
          row.owner_item_id !== selectedItemId
        ) {
          return false;
        }
        if (!q) return true;
        return (
          triggerText.toLowerCase().includes(q) ||
          outputText.toLowerCase().includes(q) ||
          (row.source_sequence_id ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.row.phase_id !== b.row.phase_id) {
          const ap = phaseNameById.get(a.row.phase_id) ?? a.row.phase_id;
          const bp = phaseNameById.get(b.row.phase_id) ?? b.row.phase_id;
          return ap.localeCompare(bp);
        }
        if (a.row.trigger !== b.row.trigger) {
          return a.row.trigger.localeCompare(b.row.trigger);
        }
        return a.triggerText.localeCompare(b.triggerText);
      });
  }, [
    rows,
    search,
    phaseFilter,
    scopeFilter,
    selectedPhaseId,
    selectedItemId,
    phaseNameById,
    itemNameById,
  ]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 rounded border border-fuchsia-200 bg-white p-2 md:grid-cols-[1fr_auto_auto]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search trigger, output, or sequence id"
          className="rounded border border-fuchsia-200 px-2 py-1 text-xs"
        />
        <select
          className="rounded border border-fuchsia-200 px-2 py-1 text-xs"
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value as "all" | "selected")}
        >
          <option value="all">Phase: all ({phaseOptions.length})</option>
          <option value="selected">Phase: selected</option>
        </select>
        <select
          className="rounded border border-fuchsia-200 px-2 py-1 text-xs"
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as "all" | "selected_item")}
          disabled={!selectedItemId}
        >
          <option value="all">Scope: all</option>
          <option value="selected_item">
            Scope: {selectedItemLabel ? `item (${selectedItemLabel})` : "selected item"}
          </option>
        </select>
      </div>

      <div className="grid grid-cols-[1.15fr_1fr_auto] gap-2 rounded border border-fuchsia-200 bg-fuchsia-50/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-900">
        <span>Trigger</span>
        <span>Output</span>
        <span>Status</span>
      </div>
      <div className="max-h-72 overflow-y-auto rounded border border-fuchsia-200 bg-white">
        {visibleRows.map(({ row, key, triggerText, outputText }) => {
          const issue = issueByRowKey.get(key);
          const selected = selectedRowKey === key;
          const canOpenSequence = !!row.source_sequence_id;
          const expanded = expandedRowKey === key;
          const leafKinds = collectOutputLeaves(row.reaction_body)
            .slice(0, 6)
            .map((l) => l.kind)
            .join(", ");
          return (
            <div
              key={key}
              className={`grid grid-cols-[1.15fr_1fr_auto] gap-2 border-b border-fuchsia-100 px-2 py-1.5 text-xs ${
                selected ? "bg-fuchsia-100/70" : "hover:bg-fuchsia-50/60"
              }`}
            >
              <button
                type="button"
                className="truncate text-left text-neutral-900"
                onClick={() => onSelectRowKey(key)}
                onDoubleClick={() => (canOpenSequence ? onOpenRow(row) : onConfigureRow(row))}
                title={triggerText}
              >
                <span className="mr-1.5 inline-block rounded border border-fuchsia-200 bg-fuchsia-50 px-1 py-0 text-[10px] text-fuchsia-900">
                  {triggerIcon(row.trigger)}
                </span>
                {triggerText}
              </button>
              <button
                type="button"
                className="truncate text-left text-neutral-700"
                onClick={() => onSelectRowKey(key)}
                onDoubleClick={() => (canOpenSequence ? onOpenRow(row) : onConfigureRow(row))}
                title={outputText}
              >
                {outputText}
              </button>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setExpandedRowKey((prev) => (prev === key ? null : key))}
                  className="rounded border border-fuchsia-200 px-1 py-0.5 text-[10px] text-fuchsia-900 hover:bg-fuchsia-50"
                  title={expanded ? "Hide details" : "Show details"}
                >
                  {expanded ? "Hide" : "View"}
                </button>
                {issue ? (
                  <span
                    className={`rounded border px-1 py-0.5 text-[10px] ${badgeClass(issue.level)}`}
                    title={issue.messages.join(" | ")}
                  >
                    {issue.level}
                  </span>
                ) : (
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[10px] text-emerald-800">
                    ok
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => (canOpenSequence ? onOpenRow(row) : onConfigureRow(row))}
                  className="rounded border border-fuchsia-300 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-900 hover:bg-fuchsia-50"
                >
                  {canOpenSequence ? "Edit" : "Configure"}
                </button>
              </div>
              {expanded ? (
                <div className="col-span-3 rounded border border-fuchsia-200 bg-white/80 px-2 py-1 text-[11px] text-neutral-700">
                  <p>
                    <strong>Output details:</strong> {summarizeReactionBody(row.reaction_body, { maxLeaves: 12 })}
                  </p>
                  <p className="mt-0.5">
                    <strong>Leaf kinds:</strong> {leafKinds || "none"}
                  </p>
                  {row.source_sequence_id ? (
                    <p className="mt-0.5">
                      <strong>Sequence:</strong> {row.source_sequence_id}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {visibleRows.length === 0 ? (
          <p className="px-3 py-3 text-xs text-neutral-600">
            No reaction rows match the current filters. Try clearing search, switching phase/scope,
            or add a new reaction below.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-fuchsia-200 bg-white p-2">
        <div className="text-[11px] text-neutral-700">
          {rows.length} total row{rows.length === 1 ? "" : "s"} on this page.
        </div>
        <div className="flex items-center gap-1">
          <select
            value={addKind}
            onChange={(e) =>
              setAddKind(e.target.value as AddReactionMode)
            }
            className="rounded border border-fuchsia-200 px-2 py-1 text-xs"
          >
            {addOptions.map((opt) => (
              <option key={opt.id} value={opt.id} disabled={!opt.enabled}>
                {opt.label}
                {!opt.enabled && opt.reasonWhenDisabled ? ` (${opt.reasonWhenDisabled})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onAddReaction(addKind)}
            disabled={!addOptions.find((x) => x.id === addKind)?.enabled}
            className="rounded border border-fuchsia-400 px-2 py-1 text-xs font-semibold text-fuchsia-900 hover:bg-fuchsia-100"
          >
            + Add reaction
          </button>
        </div>
      </div>
    </div>
  );
}
