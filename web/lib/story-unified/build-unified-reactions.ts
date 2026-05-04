import type {
  NormalizedStoryPage,
  StoryActionSequence,
  StoryActionStep,
  StoryItem,
  StoryPage,
  StoryPagePhase,
} from "@/lib/lesson-schemas";
import {
  getResolvedPhaseTransition,
  getStartPhaseIdFromNormalizedPage,
} from "@/lib/lesson-schemas";
import {
  getItemClickActionSequences,
  getPageEnterActionSequences,
  getPhaseEnterActionSequences,
} from "@/lib/story-action-sequences";
import type {
  StoryUnifiedOutputLeaf,
  StoryUnifiedReactionBodyNode,
  StoryUnifiedReactionRow,
  StoryUnifiedTrigger,
} from "@/lib/story-unified/schema";
import { storyUnifiedReactionRowSchema } from "@/lib/story-unified/schema";
import type { ValidationIssue } from "@/lib/story-unified/validate-reaction-row";
import { validateReactionRow } from "@/lib/story-unified/validate-reaction-row";

function navToPhase(nextPhaseId: string): StoryUnifiedOutputLeaf {
  return { kind: "nav", nav: { kind: "phase_id", phase_id: nextPhaseId } };
}

function stepToLeaf(step: StoryActionStep, ownerItemId: string | undefined): StoryUnifiedOutputLeaf | null {
  switch (step.kind) {
    case "play_sound":
      return {
        kind: "play_sound",
        target_item_id: step.target_item_id ?? ownerItemId,
        sound_url: step.sound_url,
      };
    case "emphasis": {
      const tid = step.target_item_id ?? ownerItemId;
      if (!tid) return null;
      return {
        kind: "emphasis",
        target_item_id: tid,
        preset: step.emphasis_preset,
        duration_ms: step.duration_ms,
      };
    }
    case "move": {
      const tid = step.target_item_id ?? ownerItemId;
      if (!tid) return null;
      return {
        kind: "path_move",
        target_item_id: tid,
        duration_ms: step.duration_ms ?? undefined,
      };
    }
    case "show_item":
      if (!step.target_item_id) return null;
      return { kind: "visibility", op: "show", item_ids: [step.target_item_id] };
    case "hide_item":
      if (!step.target_item_id) return null;
      return { kind: "visibility", op: "hide", item_ids: [step.target_item_id] };
    case "toggle_item":
      if (!step.target_item_id) return null;
      return { kind: "visibility", op: "toggle", item_ids: [step.target_item_id] };
    case "tts":
      if (!step.tts_text?.trim()) return null;
      return {
        kind: "speak",
        mode: "literal",
        text: step.tts_text.trim(),
        tts_lang: step.tts_lang,
      };
    case "smart_line":
      if (!step.smart_line_lines?.length) return null;
      return {
        kind: "speak",
        mode: "line_set",
        lines: step.smart_line_lines.map((line) => ({
          id: line.id,
          priority: line.priority,
          text: line.text,
          sound_url: line.sound_url,
          max_plays: line.max_plays,
          active_phase_ids: line.active_phase_ids,
        })),
        tts_lang: step.tts_lang,
      };
    case "info_popup":
      return {
        kind: "info_popup",
        title: step.popup_title,
        body: step.popup_body,
        image_url: step.popup_image_url,
        video_url: step.popup_video_url,
        target_item_id: step.target_item_id ?? ownerItemId,
      };
    case "goto_page": {
      const t = step.goto_target ?? "next_page";
      if (t === "next_page") {
        return { kind: "nav", nav: { kind: "story_page", target: "next" } };
      }
      if (t === "prev_page") {
        return { kind: "nav", nav: { kind: "story_page", target: "prev" } };
      }
      if (t === "page_id" && step.goto_page_id) {
        return {
          kind: "nav",
          nav: { kind: "story_page", target: "page_id", page_id: step.goto_page_id },
        };
      }
      return null;
    }
    default:
      return null;
  }
}

function stepToOutputNode(step: StoryActionStep, ownerItemId: string | undefined): StoryUnifiedReactionBodyNode | null {
  const leaf = stepToLeaf(step, ownerItemId);
  if (!leaf) return null;
  return { type: "output", leaf };
}

function stepsToReactionBody(
  steps: StoryActionStep[],
  ownerItemId: string | undefined,
): StoryUnifiedReactionBodyNode {
  const childNodes: StoryUnifiedReactionBodyNode[] = [];
  for (const step of steps) {
    const n = stepToOutputNode(step, ownerItemId);
    if (n) childNodes.push(n);
  }
  if (childNodes.length === 0) {
    return { type: "serial", children: [] };
  }
  const allSimultaneous = steps.every((s) => (s.timing ?? "simultaneous") === "simultaneous");
  if (allSimultaneous) {
    return { type: "parallel", children: childNodes };
  }
  if (steps.some((s) => s.timing === "next_click")) {
    return { type: "tap_chain", children: childNodes };
  }
  return { type: "serial", children: childNodes };
}

function sequenceToRow(
  seq: StoryActionSequence,
  phaseId: string,
  trigger: StoryUnifiedTrigger,
  ownerItemId: string | undefined,
  extras: Partial<StoryUnifiedReactionRow> = {},
): StoryUnifiedReactionRow {
  return {
    id: `norm:${seq.id}`,
    phase_id: phaseId,
    owner_item_id: ownerItemId,
    trigger,
    reaction_body: stepsToReactionBody(seq.steps ?? [], ownerItemId),
    source_sequence_id: seq.id,
    ...extras,
  };
}

function findItemIdForClickSequence(page: NormalizedStoryPage, sequenceId: string): string | undefined {
  for (const it of page.items) {
    const seqs = it.action_sequences ?? [];
    if (seqs.some((s) => s.id === sequenceId && s.event === "click")) return it.id;
  }
  return undefined;
}

/** Whether this sequence should fire in `phaseId` (dedupes unscoped + legacy clicks across phases). */
function sequenceActiveInPhase(
  seq: StoryActionSequence,
  phaseId: string,
  page: NormalizedStoryPage,
): boolean {
  const startId = getStartPhaseIdFromNormalizedPage(page);
  if (!page.phasesExplicit) {
    return phaseId === startId;
  }
  const ids = seq.active_phase_ids;
  if (ids && ids.length > 0) {
    return ids.includes(phaseId);
  }
  return phaseId === startId;
}

/** `tap_group_satisfied` lives on the parent item; tie unscoped sequences to phases whose completion uses that tap group. */
function tapGroupSatisfiedActiveInPhase(
  item: StoryItem,
  seq: StoryActionSequence,
  phaseId: string,
  page: NormalizedStoryPage,
): boolean {
  const ids = seq.active_phase_ids;
  if (ids && ids.length > 0) return ids.includes(phaseId);
  if (!page.phasesExplicit) {
    return phaseId === getStartPhaseIdFromNormalizedPage(page);
  }
  const tgId = item.tap_interaction_group?.id;
  if (!tgId) return phaseId === getStartPhaseIdFromNormalizedPage(page);
  const ph = page.phases.find((p) => p.id === phaseId);
  const c = ph?.completion;
  return c?.type === "tap_group" && c.group_id === tgId;
}

function pushCompletionRows(
  phase: StoryPagePhase,
  page: NormalizedStoryPage,
  rows: StoryUnifiedReactionRow[],
): void {
  const r = getResolvedPhaseTransition(phase);
  if (!r || r.type === "end_phase") {
    return;
  }

  const nextId = r.next_phase_id;
  const navLeaf = navToPhase(nextId);

  if (r.type === "on_click") {
    rows.push({
      id: `norm:completion:${phase.id}:on_click`,
      phase_id: phase.id,
      owner_item_id: r.target_item_id,
      trigger: "item_click",
      reaction_body: { type: "serial", children: [{ type: "output", leaf: navLeaf }] },
    });
    return;
  }

  if (r.type === "auto") {
    rows.push({
      id: `norm:completion:${phase.id}:auto`,
      phase_id: phase.id,
      trigger: "timer",
      timer_delay_ms: r.delay_ms,
      reaction_body: { type: "serial", children: [{ type: "output", leaf: navLeaf }] },
    });
    return;
  }

  if (r.type === "all_matched") {
    rows.push({
      id: `norm:completion:${phase.id}:all_matched`,
      phase_id: phase.id,
      trigger: "all_drag_matched",
      reaction_body: { type: "serial", children: [{ type: "output", leaf: navLeaf }] },
    });
    return;
  }

  if (r.type === "sequence_complete") {
    const owner = findItemIdForClickSequence(page, r.sequence_id);
    rows.push({
      id: `norm:completion:${phase.id}:seq:${r.sequence_id}`,
      phase_id: phase.id,
      owner_item_id: owner,
      trigger: "item_sequence_done",
      advance_after_sequence_id: r.sequence_id,
      reaction_body: { type: "serial", children: [{ type: "output", leaf: navLeaf }] },
    });
    return;
  }

  if (r.type === "tap_group" || r.type === "pool_interaction_quota") {
    rows.push({
      id: `norm:completion:${phase.id}:pool`,
      phase_id: phase.id,
      trigger: "pool_quota_met",
      reaction_body: { type: "serial", children: [{ type: "output", leaf: navLeaf }] },
    });
  }
}

export type BuildUnifiedReactionsResult = {
  rows: StoryUnifiedReactionRow[];
  issues: ValidationIssue[];
  parseErrors: string[];
};

/**
 * Builds unified reaction rows from a **normalized** story page (see `getNormalizedStoryPages`).
 * Read-only compiler — does not mutate payload. Run `validateReactionRow` on each row.
 */
export function buildUnifiedReactionsFromStoryPage(
  page: NormalizedStoryPage,
): BuildUnifiedReactionsResult {
  const rows: StoryUnifiedReactionRow[] = [];
  const issues: ValidationIssue[] = [];
  const parseErrors: string[] = [];

  const storyPage = page as unknown as StoryPage;
  const startPhaseId = getStartPhaseIdFromNormalizedPage(page);

  for (const seq of getPageEnterActionSequences(storyPage, { includeLegacy: true })) {
    rows.push(sequenceToRow(seq, startPhaseId, "phase_enter", undefined));
  }

  for (const ph of page.phases) {
    for (const seq of getPhaseEnterActionSequences(ph, { includeLegacy: true })) {
      rows.push(sequenceToRow(seq, ph.id, "phase_enter", undefined));
    }
    for (const seq of ph.action_sequences ?? []) {
      if (seq.event === "pool_quota_met") {
        rows.push(sequenceToRow(seq, ph.id, "pool_quota_met", undefined));
      }
    }
    pushCompletionRows(ph, page, rows);
  }

  for (const ph of page.phases) {
    const activeId = page.phasesExplicit ? ph.id : startPhaseId;
    for (const it of page.items) {
      for (const seq of getItemClickActionSequences(it, {
        includeLegacy: true,
        activePhaseId: activeId,
      })) {
        if (seq.event !== "click") continue;
        if (!sequenceActiveInPhase(seq, ph.id, page)) continue;
        rows.push(sequenceToRow(seq, ph.id, "item_click", it.id));
      }
      for (const seq of it.action_sequences ?? []) {
        if (seq.event !== "tap_group_satisfied") continue;
        if (!tapGroupSatisfiedActiveInPhase(it, seq, ph.id, page)) continue;
        rows.push(sequenceToRow(seq, ph.id, "pool_quota_met", undefined));
      }
    }
  }

  const validatedRows: StoryUnifiedReactionRow[] = [];
  for (const row of rows) {
    const parsed = storyUnifiedReactionRowSchema.safeParse(row);
    if (!parsed.success) {
      parseErrors.push(`${row.id ?? "?"}: ${parsed.error.message}`);
      continue;
    }
    const pr = parsed.data;
    const phase = page.phases.find((p) => p.id === pr.phase_id) ?? null;
    validatedRows.push(pr);
    issues.push(...validateReactionRow(pr, storyPage, phase));
  }

  return { rows: validatedRows, issues, parseErrors };
}
