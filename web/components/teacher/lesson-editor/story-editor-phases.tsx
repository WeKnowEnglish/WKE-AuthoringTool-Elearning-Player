"use client";

import { useMemo } from "react";
import type {
  StoryItem,
  StoryPage,
  StoryPagePhase,
  StoryPhaseCompletion,
  StoryPhaseInteractionKind,
  StoryPhaseOnEnterStep,
} from "@/lib/lesson-schemas";

export const STORY_EDITOR_VIRTUAL_PHASE_ID = "__editor_ph_virtual__";

/** UI-only phases when a page has no `phases` in JSON. */
export function getEditorPhases(page: StoryPage): StoryPagePhase[] {
  if (page.phases && page.phases.length > 0) return page.phases;
  return [
    {
      id: STORY_EDITOR_VIRTUAL_PHASE_ID,
      name: "Scene",
      is_start: true,
      next_phase_id: null,
      visible_item_ids: undefined,
      advance_on_item_tap_id: null,
    },
  ];
}

export function sanitizePageForPayload(page: StoryPage): StoryPage {
  if (!page.phases?.length) {
    return { ...page, phases: undefined };
  }
  return page;
}

export function isEditorVirtualPhases(
  page: StoryPage,
): page is StoryPage & { phases?: undefined } {
  return !page.phases || page.phases.length === 0;
}

function newEntityId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Whitelist: item visible. No whitelist: use show_on_start for each item. */
export function isItemVisibleInEditorPhase(
  phase: StoryPagePhase,
  it: StoryItem,
  pageHasRealPhases: boolean,
): boolean {
  if (!pageHasRealPhases) return true;
  if (phase.visible_item_ids != null) {
    return phase.visible_item_ids.includes(it.id);
  }
  return it.show_on_start !== false;
}

export function createTwoInitialPhases(): StoryPagePhase[] {
  const a = newEntityId("ph");
  const b = newEntityId("ph");
  return [
    {
      id: a,
      name: "Step 1",
      is_start: true,
      next_phase_id: b,
      visible_item_ids: undefined,
      advance_on_item_tap_id: null,
    },
    {
      id: b,
      name: "Step 2",
      is_start: false,
      next_phase_id: null,
      visible_item_ids: undefined,
      advance_on_item_tap_id: null,
    },
  ];
}

export function appendPhase(
  current: StoryPagePhase[],
  itemIdsForDefaultWhitelist: string[],
): StoryPagePhase[] {
  if (current.length === 0) return createTwoInitialPhases();
  const newId = newEntityId("ph");
  const last = current[current.length - 1];
  const withLink = current.slice(0, -1).concat({
    ...last,
    next_phase_id: newId,
  });
  return [
    ...withLink,
    {
      id: newId,
      name: `Step ${withLink.length + 1}`,
      is_start: false,
      next_phase_id: null,
      visible_item_ids: itemIdsForDefaultWhitelist.length
        ? [...itemIdsForDefaultWhitelist]
        : undefined,
      advance_on_item_tap_id: null,
    },
  ];
}

export function removePhaseAt(
  current: StoryPagePhase[],
  index: number,
): StoryPagePhase[] {
  if (index < 0 || index >= current.length) return current;
  if (current.length <= 1) {
    return [];
  }
  const filtered = current.filter((_, i) => i !== index);
  for (let i = 0; i < filtered.length; i++) {
    filtered[i] = {
      ...filtered[i]!,
      is_start: i === 0,
      next_phase_id: i < filtered.length - 1 ? filtered[i + 1]!.id : null,
    };
  }
  return filtered;
}

type ColumnProps = {
  phases: StoryPagePhase[];
  selectedPhaseId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  busy: boolean;
};

export function StoryPhasesColumn({
  phases,
  selectedPhaseId,
  onSelect,
  onAdd,
  onRemove,
  busy,
}: ColumnProps) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-900">
        Phases
      </p>
      <p className="mb-2 text-[10px] text-violet-800/80">
        Switch phases to set visibility and what advances the scene.
      </p>
      <ol className="mt-1 space-y-0.5">
        {phases.map((p, i) => (
          <li key={p.id}>
            <div className="flex items-stretch gap-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSelect(p.id)}
                className={`min-w-0 flex-1 rounded-l border px-1.5 py-1.5 text-left text-[11px] leading-tight ${
                  p.id === selectedPhaseId
                    ? "border-violet-500 bg-white font-semibold text-violet-950 shadow-sm"
                    : "border-violet-200/80 bg-violet-100/30 text-violet-900 hover:border-violet-300"
                }`}
              >
                <span className="text-[9px] text-violet-600">{i + 1}. </span>
                {p.name?.trim() || `Phase ${i + 1}`}
                {p.is_start ? (
                  <span className="ml-0.5 text-[9px] text-emerald-700">(start)</span>
                ) : null}
              </button>
              {phases.length > 1 ? (
                <button
                  type="button"
                  title="Remove phase"
                  disabled={busy}
                  className="shrink-0 rounded-r border border-red-200/80 bg-red-50 px-1 text-[10px] font-bold text-red-800 hover:bg-red-100"
                  onClick={() => onRemove(p.id)}
                >
                  ×
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={busy}
        onClick={onAdd}
        className="mt-2 w-full rounded border border-dashed border-violet-400 bg-white/80 px-2 py-1.5 text-[11px] font-semibold text-violet-900 hover:bg-violet-50"
      >
        + Add phase
      </button>
    </div>
  );
}

type Props = {
  phase: StoryPagePhase;
  allPhases: StoryPagePhase[];
  pageItems: StoryItem[];
  pageHasRealPhases: boolean;
  onUpdatePhase: (patch: Partial<StoryPagePhase>) => void;
  onSetStart: (phaseId: string) => void;
  busy: boolean;
};

export function StoryPhaseProperties({
  phase,
  allPhases,
  pageItems,
  pageHasRealPhases,
  onUpdatePhase,
  onSetStart,
  busy,
}: Props) {
  const clickSequencesForPicker = useMemo(() => {
    if (!pageHasRealPhases) return [];
    const out: { id: string; label: string }[] = [];
    for (const it of pageItems) {
      for (const seq of it.action_sequences ?? []) {
        if (seq.event !== "click") continue;
        out.push({
          id: seq.id,
          label: `${it.name?.trim() || it.id.slice(0, 8)} · ${seq.name?.trim() || "Animation"}`,
        });
      }
      const legacyTriggers = it.on_click?.triggers ?? [];
      if (legacyTriggers.length > 0) {
        out.push({
          id: `legacy:item:${it.id}:triggers`,
          label: `${it.name?.trim() || it.id.slice(0, 8)} · Legacy tap triggers`,
        });
      }
    }
    return out;
  }, [pageHasRealPhases, pageItems]);

  if (!pageHasRealPhases) {
    return (
      <div className="space-y-2 rounded border border-neutral-200 bg-white/90 p-3">
        <p className="text-sm font-semibold text-neutral-800">Phases (scene flow)</p>
        <p className="text-xs text-neutral-600">
          This page uses a single automatic scene. Use <strong>+ Add phase</strong> in the
          list to add step-by-step interaction (visibility, then tap to go to the next
          step in the live lesson).
        </p>
      </div>
    );
  }

  const useCustomList = phase.visible_item_ids != null;
  const kind: StoryPhaseInteractionKind = phase.kind ?? "click_to_advance";
  const completion: StoryPhaseCompletion | undefined = phase.completion;
  const compType =
    completion?.type
      ? completion.type
      : phase.advance_on_item_tap_id && phase.next_phase_id ? "on_click" as const
      : "end_phase" as const;

  function setNextPhaseId(next: string | null) {
    const nextId = next || null;
    const c = phase.completion;
    if (c?.type === "on_click") {
      if (nextId) {
        onUpdatePhase({
          next_phase_id: nextId,
          completion: {
            type: "on_click",
            target_item_id: c.target_item_id,
            next_phase_id: nextId,
          },
          advance_on_item_tap_id: null,
        });
      } else {
        onUpdatePhase({
          next_phase_id: null,
          completion: { type: "end_phase" },
          advance_on_item_tap_id: null,
        });
      }
    } else if (c?.type === "auto") {
      if (nextId) {
        onUpdatePhase({
          next_phase_id: nextId,
          completion: {
            type: "auto",
            delay_ms: c.delay_ms,
            next_phase_id: nextId,
          },
          advance_on_item_tap_id: null,
        });
      } else {
        onUpdatePhase({
          next_phase_id: null,
          completion: { type: "end_phase" },
          advance_on_item_tap_id: null,
        });
      }
    } else if (c?.type === "all_matched") {
      if (nextId) {
        onUpdatePhase({
          next_phase_id: nextId,
          completion: { type: "all_matched", next_phase_id: nextId },
        });
      } else {
        onUpdatePhase({
          next_phase_id: null,
          completion: { type: "end_phase" },
        });
      }
    } else if (c?.type === "sequence_complete") {
      if (nextId) {
        onUpdatePhase({
          next_phase_id: nextId,
          completion: {
            type: "sequence_complete",
            sequence_id: c.sequence_id,
            next_phase_id: nextId,
          },
        });
      } else {
        onUpdatePhase({
          next_phase_id: null,
          completion: { type: "end_phase" },
        });
      }
    } else {
      onUpdatePhase({ next_phase_id: nextId });
    }
  }

  function setCompletionType(t: "end_phase" | "on_click" | "auto" | "sequence_complete") {
    const next = phase.next_phase_id;
    if (t === "end_phase") {
      onUpdatePhase({ completion: { type: "end_phase" }, advance_on_item_tap_id: null });
    } else if (t === "on_click") {
      const target = pageItems[0]?.id;
      if (!next || !target) {
        onUpdatePhase({ completion: { type: "end_phase" } });
        return;
      }
      onUpdatePhase({
        completion: { type: "on_click", target_item_id: target, next_phase_id: next },
        advance_on_item_tap_id: null,
      });
    } else if (t === "sequence_complete") {
      const firstSeq = clickSequencesForPicker[0];
      if (!next || !firstSeq) {
        onUpdatePhase({ completion: { type: "end_phase" } });
        return;
      }
      onUpdatePhase({
        completion: {
          type: "sequence_complete",
          sequence_id: firstSeq.id,
          next_phase_id: next,
        },
        advance_on_item_tap_id: null,
      });
    } else {
      if (!next) {
        onUpdatePhase({ completion: { type: "end_phase" } });
        return;
      }
      onUpdatePhase({
        completion: { type: "auto", delay_ms: 2000, next_phase_id: next },
        advance_on_item_tap_id: null,
      });
    }
  }

  return (
    <div className="space-y-3 rounded border border-neutral-200 bg-white/90 p-3">
      <p className="text-sm font-semibold text-neutral-800">Active phase</p>
      <p className="text-[11px] text-neutral-500">
        Guided mode uses <strong>completion</strong> and optional on-enter actions. Set{" "}
        <strong>Legacy</strong> to use the canvas trigger popups only.
      </p>
      <label className="block text-xs font-medium text-neutral-700">
        Name
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={phase.name ?? ""}
          disabled={busy}
          onChange={(e) => onUpdatePhase({ name: e.target.value || undefined })}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-neutral-800">
        <input
          type="radio"
          name="ph-start"
          disabled={busy}
          checked={!!phase.is_start}
          onChange={() => onSetStart(phase.id)}
        />
        This is the start phase when the page is shown
      </label>
      <label className="block text-xs font-medium text-neutral-700">
        Phase interaction mode
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          disabled={busy}
          value={kind}
          onChange={(e) => {
            const v = e.target.value as StoryPhaseInteractionKind;
            if (v === "drag_match") {
              const d0 = pageItems[0]?.id;
              const t0 = pageItems[1]?.id ?? d0;
              const nextP =
                phase.next_phase_id ??
                allPhases.find((p) => p.id !== phase.id)?.id;
              if (!d0) return;
              onUpdatePhase({
                kind: "drag_match",
                completion:
                  nextP ?
                    { type: "all_matched", next_phase_id: nextP }
                  : { type: "end_phase" },
                drag_match:
                  phase.drag_match
                  ?? {
                    draggable_item_ids: [d0],
                    target_item_ids: t0 && t0 !== d0 ? [d0, t0] : [d0],
                    correct_map: { [d0]: t0 ?? d0 },
                    after_correct_match: "return_home",
                  },
                advance_on_item_tap_id: null,
              });
            } else {
              onUpdatePhase({ kind: v, drag_match: undefined });
            }
          }}
        >
          <option value="click_to_advance">Guided: click / completion</option>
          <option value="drag_match">In-scene: drag &amp; match items</option>
          <option value="none">No tap-to-advance (use auto or end only)</option>
          <option value="legacy">Legacy: canvas click triggers &amp; item taps</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-neutral-700">
        Next phase in sequence
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          disabled={busy}
          value={phase.next_phase_id ?? ""}
          onChange={(e) => setNextPhaseId(e.target.value || null)}
        >
          <option value="">(none — end of scene flow for this page)</option>
          {allPhases
            .filter((p) => p.id !== phase.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.id}
              </option>
            ))}
        </select>
      </label>
      {kind === "legacy" ? (
        <label className="block text-xs font-medium text-neutral-700">
          Legacy: advance when student taps (after triggers)
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            disabled={busy || !phase.next_phase_id}
            value={phase.advance_on_item_tap_id ?? ""}
            onChange={(e) =>
              onUpdatePhase({
                advance_on_item_tap_id: e.target.value || null,
                completion: undefined,
              })
            }
          >
            <option value="">(no phase advance from tap)</option>
            {pageItems.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name?.trim() || it.id}
              </option>
            ))}
          </select>
        </label>
      ) : kind === "drag_match" ? (
        <div className="space-y-2 rounded border border-violet-100 bg-violet-50/50 p-2">
          <p className="text-[11px] font-semibold text-violet-950">Drag &amp; match</p>
          <p className="text-[10px] text-violet-900">
            Students <strong>drag</strong> each draggable image onto a target. When every pairing is
            correct, the scene advances to the next phase (set above). Use{" "}
            <strong>Line when tapped</strong> on an item so characters can ask for a snack (tap, not
            drop).
          </p>
          {!phase.next_phase_id || phase.completion?.type !== "all_matched" ? (
            <p className="text-[10px] text-amber-800">
              Choose a <strong>Next phase in sequence</strong> so the lesson can advance when all
              match.
            </p>
          ) : null}
          {!phase.drag_match ? (
            <p className="text-[11px] text-red-600">
              Missing drag data — switch the mode away and back to <strong>Drag &amp; match</strong>.
            </p>
          ) : (
            <>
              <p className="text-[11px] font-medium text-neutral-800">Draggable (what moves)</p>
              <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px]">
                {pageItems.map((it) => {
                  const dm = phase.drag_match!;
                  const on = dm.draggable_item_ids.includes(it.id);
                  return (
                    <li key={`d-${it.id}`}>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={busy}
                          onChange={() => {
                            if (on) {
                              const nextD = dm.draggable_item_ids.filter((x) => x !== it.id);
                              const { [it.id]: _r, ...rest } = dm.correct_map;
                              onUpdatePhase({
                                drag_match: {
                                  ...dm,
                                  draggable_item_ids: nextD,
                                  correct_map: rest,
                                },
                              });
                            } else {
                              const tFirst = dm.target_item_ids[0] ?? it.id;
                              onUpdatePhase({
                                drag_match: {
                                  ...dm,
                                  draggable_item_ids: [...dm.draggable_item_ids, it.id],
                                  correct_map: { ...dm.correct_map, [it.id]: tFirst },
                                },
                              });
                            }
                          }}
                        />
                        {it.name?.trim() || it.id.slice(0, 8)}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] font-medium text-neutral-800">Drop targets</p>
              <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px]">
                {pageItems.map((it) => {
                  const dm = phase.drag_match!;
                  const on = dm.target_item_ids.includes(it.id);
                  return (
                    <li key={`t-${it.id}`}>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={busy}
                          onChange={() => {
                            if (on) {
                              const nextT = dm.target_item_ids.filter((x) => x !== it.id);
                              const nextMap = { ...dm.correct_map };
                              for (const k of Object.keys(nextMap)) {
                                if (nextMap[k] === it.id) {
                                  const fallback = nextT[0] ?? k;
                                  nextMap[k] = fallback;
                                }
                              }
                              onUpdatePhase({
                                drag_match: { ...dm, target_item_ids: nextT, correct_map: nextMap },
                              });
                            } else {
                              onUpdatePhase({
                                drag_match: {
                                  ...dm,
                                  target_item_ids: [...dm.target_item_ids, it.id],
                                },
                              });
                            }
                          }}
                        />
                        {it.name?.trim() || it.id.slice(0, 8)}
                      </label>
                    </li>
                  );
                })}
              </ul>
              {phase.drag_match.draggable_item_ids.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-neutral-800">Correct pairing</p>
                  {phase.drag_match.draggable_item_ids.map((did) => {
                    const dm = phase.drag_match!;
                    return (
                      <label key={did} className="block text-[11px] text-neutral-700">
                        {pageItems.find((x) => x.id === did)?.name || did} →
                        <select
                          className="ml-1 mt-0.5 block w-full max-w-xs rounded border px-1 py-0.5"
                          disabled={busy}
                          value={dm.correct_map[did] ?? ""}
                          onChange={(e) => {
                            onUpdatePhase({
                              drag_match: {
                                ...dm,
                                correct_map: { ...dm.correct_map, [did]: e.target.value },
                              },
                            });
                          }}
                        >
                          {dm.target_item_ids.map((tid) => (
                            <option key={tid} value={tid}>
                              {pageItems.find((x) => x.id === tid)?.name || tid}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
              ) : null}
              {phase.drag_match ? (
                <label className="mt-2 block text-[11px] font-medium text-neutral-800">
                  After a correct match
                  <select
                    className="mt-1 w-full max-w-xs rounded border px-1 py-0.5 text-[11px]"
                    disabled={busy}
                    value={phase.drag_match.after_correct_match ?? "return_home"}
                    onChange={(e) => {
                      const dm = phase.drag_match!;
                      const v = e.target.value as
                        | "hide"
                        | "return_home"
                        | "stick_on_target";
                      onUpdatePhase({
                        drag_match: { ...dm, after_correct_match: v },
                      });
                    }}
                  >
                    <option value="return_home">Return to start position</option>
                    <option value="stick_on_target">Stay on drop target</option>
                    <option value="hide">Disappear</option>
                  </select>
                </label>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1 rounded border border-sky-100 bg-sky-50/50 p-2">
          <p className="text-[11px] font-semibold text-sky-950">When to go to the next phase</p>
          <label className="block text-xs text-neutral-700">
            Transition
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              disabled={busy}
              value={compType}
              onChange={(e) =>
                setCompletionType(
                  e.target.value as
                    | "end_phase"
                    | "on_click"
                    | "auto"
                    | "sequence_complete",
                )
              }
            >
              <option value="end_phase">Stay on this phase (no auto)</option>
              <option value="on_click" disabled={!phase.next_phase_id}>
                Student taps an item
              </option>
              <option
                value="sequence_complete"
                disabled={
                  !phase.next_phase_id || clickSequencesForPicker.length === 0
                }
              >
                When a click animation finishes
              </option>
              <option value="auto" disabled={!phase.next_phase_id}>
                After a delay
              </option>
            </select>
          </label>
          {compType === "sequence_complete" && phase.next_phase_id && (
            <div className="mt-1 space-y-1">
              <p className="text-[10px] text-sky-900">
                Advances after the selected click animation finishes (delays and step durations
                included). For multi-tap chains, this runs after the <strong>final</strong> tap in
                the chain. Spoken audio length is not waited on.
              </p>
              <label className="block text-xs text-neutral-700">
                Animation (click sequence)
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  disabled={busy || clickSequencesForPicker.length === 0}
                  value={
                    completion?.type === "sequence_complete" ?
                      completion.sequence_id
                    : clickSequencesForPicker[0]?.id ?? ""}
                  onChange={(e) => {
                    const sequence_id = e.target.value;
                    if (!sequence_id || !phase.next_phase_id) return;
                    onUpdatePhase({
                      completion: {
                        type: "sequence_complete",
                        sequence_id,
                        next_phase_id: phase.next_phase_id,
                      },
                      advance_on_item_tap_id: null,
                    });
                  }}
                >
                  {clickSequencesForPicker.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {compType === "on_click" && phase.next_phase_id && (
            <label className="mt-1 block text-xs text-neutral-700">
              Tap this item
              <select
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                disabled={busy}
                value={
                  completion?.type === "on_click" ?
                    completion.target_item_id
                  : phase.advance_on_item_tap_id ?? pageItems[0]?.id}
                onChange={(e) => {
                  const target_item_id = e.target.value;
                  onUpdatePhase({
                    completion: {
                      type: "on_click",
                      target_item_id,
                      next_phase_id: phase.next_phase_id!,
                    },
                    advance_on_item_tap_id: null,
                  });
                }}
              >
                {pageItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name?.trim() || it.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {compType === "auto" && phase.next_phase_id && (
            <label className="mt-1 block text-xs text-neutral-700">
              Delay (ms) before next phase
              <input
                type="number"
                min={0}
                max={120000}
                step={200}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                disabled={busy}
                value={completion?.type === "auto" ? completion.delay_ms : 2000}
                onChange={(e) => {
                  const delay_ms = Math.max(0, Number(e.target.value) || 0);
                  onUpdatePhase({
                    completion: {
                      type: "auto",
                      delay_ms,
                      next_phase_id: phase.next_phase_id!,
                    },
                    advance_on_item_tap_id: null,
                  });
                }}
              />
            </label>
          )}
        </div>
      )}
      <div className="space-y-1 border-t border-neutral-200 pt-2">
        <p className="text-xs font-semibold text-neutral-800">On enter this phase (optional)</p>
        <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
          {(phase.on_enter ?? []).map((row, i) => (
            <li key={`oe-${i}`} className="rounded border border-neutral-100 p-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <select
                  className="rounded border text-[11px]"
                  disabled={busy}
                  value={row.action}
                  onChange={(e) => {
                    const next = (phase.on_enter ?? []).slice();
                    const action = e.target.value as StoryPhaseOnEnterStep["action"];
                    // Preserve fields when switching actions so the payload stays loadable
                    // (e.g. play_sound may temporarily lack sound_url until the teacher pastes a URL).
                    if (action === "play_sound") {
                      next[i] = { ...row, action, item_id: undefined, item_ids: undefined };
                    } else if (action === "show_item" || action === "hide_item") {
                      next[i] = {
                        ...row,
                        action,
                        item_id: pageItems[0]?.id,
                        item_ids: undefined,
                        sound_url: undefined,
                        emphasis_preset: undefined,
                        duration_ms: undefined,
                      };
                    } else if (action === "emphasis") {
                      next[i] = {
                        ...row,
                        action,
                        item_id: pageItems[0]?.id,
                        item_ids: undefined,
                        sound_url: undefined,
                      };
                    } else {
                      next[i] = { action };
                    }
                    onUpdatePhase({ on_enter: next });
                  }}
                >
                  <option value="show_item">show</option>
                  <option value="hide_item">hide</option>
                  <option value="emphasis">emphasis</option>
                  <option value="play_sound">sound</option>
                </select>
                {row.action === "play_sound" ? (
                  <input
                    className="min-w-0 flex-1 rounded border px-1 text-[11px]"
                    placeholder="sound URL"
                    disabled={busy}
                    value={row.sound_url ?? ""}
                    onChange={(e) => {
                      const next = (phase.on_enter ?? []).slice();
                      next[i] = { ...row, sound_url: e.target.value || undefined };
                      onUpdatePhase({ on_enter: next });
                    }}
                  />
                ) : null}
                {(row.action === "show_item" || row.action === "hide_item") &&
                !row.item_ids ? (
                  <select
                    className="max-w-full rounded border text-[11px]"
                    disabled={busy}
                    value={row.item_id ?? ""}
                    onChange={(e) => {
                      const next = (phase.on_enter ?? []).slice();
                      next[i] = { ...row, item_id: e.target.value || undefined };
                      onUpdatePhase({ on_enter: next });
                    }}
                  >
                    {pageItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name?.trim() || it.id}
                      </option>
                    ))}
                  </select>
                ) : null}
                {row.action === "emphasis" ? (
                  <select
                    className="rounded border text-[11px]"
                    disabled={busy}
                    value={row.item_id ?? ""}
                    onChange={(e) => {
                      const next = (phase.on_enter ?? []).slice();
                      next[i] = { ...row, item_id: e.target.value || undefined };
                      onUpdatePhase({ on_enter: next });
                    }}
                  >
                    {pageItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name?.trim() || it.id}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  className="text-[10px] text-red-700"
                  disabled={busy}
                  onClick={() => {
                    const next = (phase.on_enter ?? []).filter((_, j) => j !== i);
                    onUpdatePhase({ on_enter: next.length > 0 ? next : undefined });
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-dashed border-neutral-300 px-2 py-1 text-[11px]"
          onClick={() => {
            const add: StoryPhaseOnEnterStep = {
              action: "show_item",
              item_id: pageItems[0]?.id,
            };
            onUpdatePhase({ on_enter: [...(phase.on_enter ?? []), add] });
          }}
        >
          + On enter step
        </button>
      </div>
      <div className="space-y-1 border-t border-neutral-200 pt-2">
        <p className="text-xs font-semibold text-neutral-800">Player text (optional)</p>
        <label className="block text-[11px] text-neutral-700">
          Line at start of phase
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
            disabled={busy}
            value={phase.dialogue?.start ?? ""}
            onChange={(e) =>
              onUpdatePhase({
                dialogue: { ...phase.dialogue, start: e.target.value || undefined },
              })
            }
          />
        </label>
        <label className="block text-[11px] text-neutral-700">
          Success (reserved)
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
            disabled={busy}
            value={phase.dialogue?.success ?? ""}
            onChange={(e) =>
              onUpdatePhase({
                dialogue: { ...phase.dialogue, success: e.target.value || undefined },
              })
            }
          />
        </label>
        <label className="block text-[11px] text-neutral-700">
          Error (reserved)
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
            disabled={busy}
            value={phase.dialogue?.error ?? ""}
            onChange={(e) =>
              onUpdatePhase({
                dialogue: { ...phase.dialogue, error: e.target.value || undefined },
              })
            }
          />
        </label>
      </div>
      <div className="space-y-1 border-t border-neutral-200 pt-2">
        <p className="text-xs font-semibold text-neutral-800">Highlight items in player</p>
        <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs">
          {pageItems.map((it) => {
            const on = phase.highlight_item_ids?.includes(it.id) ?? false;
            return (
              <li key={`hi-${it.id}`}>
                <label className="flex items-center gap-1 text-neutral-800">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={on}
                    onChange={(e) => {
                      const set = new Set(phase.highlight_item_ids ?? []);
                      if (e.target.checked) set.add(it.id);
                      else set.delete(it.id);
                      onUpdatePhase({
                        highlight_item_ids: set.size > 0 ? [...set] : undefined,
                      });
                    }}
                  />
                  {it.name?.trim() || it.id}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="space-y-2 border-t border-neutral-200 pt-2">
        <p className="text-xs font-semibold text-neutral-800">Visible items in this phase</p>
        <label className="flex items-center gap-2 text-xs text-neutral-700">
          <input
            type="radio"
            name="ph-vis"
            disabled={busy}
            checked={!useCustomList}
            onChange={() => onUpdatePhase({ visible_item_ids: undefined })}
          />
          Default (use &quot;Show on page start&quot; per item)
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-700">
          <input
            type="radio"
            name="ph-vis"
            disabled={busy}
            checked={useCustomList}
            onChange={() => {
              const init = pageItems
                .filter((it) => it.show_on_start !== false)
                .map((it) => it.id);
              onUpdatePhase({ visible_item_ids: init.length ? init : [pageItems[0]!.id] });
            }}
          />
          Custom list
        </label>
        {useCustomList && phase.visible_item_ids != null ? (
          <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto rounded border border-neutral-100 bg-neutral-50/60 p-2 text-xs">
            {pageItems.map((it) => {
              const on = phase.visible_item_ids?.includes(it.id) ?? false;
              return (
                <li key={it.id}>
                  <label className="flex items-center gap-2 text-neutral-800">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={on}
                      onChange={(e) => {
                        const set = new Set(phase.visible_item_ids ?? []);
                        if (e.target.checked) set.add(it.id);
                        else set.delete(it.id);
                        onUpdatePhase({ visible_item_ids: [...set] });
                      }}
                    />
                    {it.name?.trim() || it.id}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
