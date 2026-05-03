import type { StoryPage, StoryPagePhase } from "@/lib/lesson-schemas";
import { getPhaseInteractionKind } from "@/lib/lesson-schemas";
import type {
  StoryUnifiedOutputLeaf,
  StoryUnifiedReactionBodyNode,
  StoryUnifiedReactionRow,
} from "@/lib/story-unified/schema";

export type ValidationIssueLevel = "error" | "warn";

export type ValidationIssue = {
  level: ValidationIssueLevel;
  code: string;
  message: string;
};

/** Reserved for future `kind: "info_balloon"` on `StoryItem`; `button` is valid today. */
export function itemKindAllowsInfoPopup(kind: string | undefined): boolean {
  const k = kind ?? "image";
  return k === "button" || k === "info_balloon";
}

function collectOutputLeaves(node: StoryUnifiedReactionBodyNode): StoryUnifiedOutputLeaf[] {
  if (node.type === "output") return [node.leaf];
  return node.children.flatMap((c) => collectOutputLeaves(c));
}

function phaseHasPoolQuotaConfig(phase: StoryPagePhase, page: StoryPage): boolean {
  const c = phase.completion;
  if (c?.type === "pool_interaction_quota" || c?.type === "tap_group") return true;
  if ((phase.action_sequences ?? []).some((s) => s.event === "pool_quota_met")) return true;
  if (page.items.some((it) => it.tap_interaction_group)) return true;
  return false;
}

function reactionBodyContainsNavToLessonScreen(node: StoryUnifiedReactionBodyNode): boolean {
  const leaves = collectOutputLeaves(node);
  return leaves.some((l) => l.kind === "nav" && l.nav.kind === "lesson_screen");
}

function reactionBodyNavLeaves(node: StoryUnifiedReactionBodyNode) {
  return collectOutputLeaves(node).filter(
    (l): l is Extract<StoryUnifiedOutputLeaf, { kind: "nav" }> => l.kind === "nav",
  );
}

/**
 * Validates a unified reaction row against a story page and active phase.
 * Call after parsing with `storyUnifiedReactionRowSchema` (or when building IR in the normalizer).
 *
 * @param phase Required for v1 — page-level-only rows are not supported yet.
 */
export function validateReactionRow(
  row: StoryUnifiedReactionRow,
  page: StoryPage,
  phase: StoryPagePhase | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!phase) {
    issues.push({
      level: "error",
      code: "phase_required",
      message: "validateReactionRow requires a non-null phase for v1",
    });
    return issues;
  }

  if (row.phase_id !== phase.id) {
    issues.push({
      level: "error",
      code: "phase_id_mismatch",
      message: `Row phase_id ${row.phase_id} does not match active phase ${phase.id}`,
    });
  }

  if (row.trigger === "item_click" && !row.owner_item_id?.trim()) {
    issues.push({
      level: "error",
      code: "item_click_requires_owner",
      message: "item_click trigger requires owner_item_id",
    });
  }

  if (row.trigger === "item_sequence_done" && !row.owner_item_id?.trim()) {
    issues.push({
      level: "error",
      code: "item_sequence_done_requires_owner",
      message: "item_sequence_done trigger requires owner_item_id",
    });
  }

  if (row.trigger === "timer" && row.timer_delay_ms == null) {
    issues.push({
      level: "error",
      code: "timer_requires_delay",
      message: "timer trigger requires timer_delay_ms",
    });
  }

  const interactionKind = getPhaseInteractionKind(phase);

  if (row.trigger === "all_drag_matched") {
    if (interactionKind !== "drag_match" || !phase.drag_match) {
      issues.push({
        level: "error",
        code: "all_drag_matched_requires_drag_match",
        message: "all_drag_matched is only valid when the phase uses drag_match with drag_match config",
      });
    }
    const navs = reactionBodyNavLeaves(row.reaction_body);
    const hasPhaseNav = navs.some(
      (n) =>
        n.nav.kind === "next_phase" ||
        n.nav.kind === "phase_id" ||
        n.nav.kind === "end_phase",
    );
    if (!hasPhaseNav) {
      issues.push({
        level: "warn",
        code: "all_drag_matched_nav_suggested",
        message:
          "all_drag_matched typically should include nav (next_phase, phase_id, or end_phase) so the learner can advance",
      });
    }
  }

  if (row.trigger === "pool_quota_met" && !phaseHasPoolQuotaConfig(phase, page)) {
    issues.push({
      level: "error",
      code: "pool_quota_met_requires_pool",
      message:
        "pool_quota_met requires pool config (phase completion pool_interaction_quota or tap_group, pool_quota_met sequence, or item tap_interaction_group)",
    });
  }

  if (row.trigger === "item_click" && reactionBodyContainsNavToLessonScreen(row.reaction_body)) {
    const lessonNavOutsideTapChain = containsNavLessonScreenOutsideTapChain(row.reaction_body);
    if (lessonNavOutsideTapChain) {
      issues.push({
        level: "warn",
        code: "item_click_lesson_nav",
        message:
          "item_click with nav to lesson_screen outside tap_chain can skip the lesson on every tap; prefer wrapping in tap_chain or gating",
      });
    }
  }

  const leaves = collectOutputLeaves(row.reaction_body);
  const itemMap = new Map(page.items.map((it) => [it.id, it]));

  for (const leaf of leaves) {
    if (leaf.kind === "path_move") {
      const it = itemMap.get(leaf.target_item_id);
      const wp = it?.path?.waypoints;
      if (!it || !wp || wp.length < 2) {
        issues.push({
          level: "error",
          code: "path_move_requires_path",
          message: `path_move target ${leaf.target_item_id} must exist and have path.waypoints (at least 2)`,
        });
      }
    }

    if (leaf.kind === "info_popup") {
      const anchorId = leaf.target_item_id ?? row.owner_item_id;
      if (!anchorId) {
        issues.push({
          level: "error",
          code: "info_popup_requires_anchor",
          message: "info_popup requires target_item_id or row owner_item_id to validate item kind",
        });
      } else {
        const it = itemMap.get(anchorId);
        if (!it) {
          issues.push({
            level: "error",
            code: "info_popup_unknown_item",
            message: `info_popup anchor item ${anchorId} not found on page`,
          });
        } else if (!itemKindAllowsInfoPopup(it.kind)) {
          issues.push({
            level: "error",
            code: "info_popup_invalid_kind",
            message: `info_popup is only allowed for button or info_balloon items; item ${anchorId} is ${it.kind ?? "image"}`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Returns true if there is nav→lesson_screen under output that is NOT inside a tap_chain ancestor.
 * Used for coarse "every tap skips lesson" warning (simplified vs full tree policy).
 */
function containsNavLessonScreenOutsideTapChain(node: StoryUnifiedReactionBodyNode): boolean {
  const walk = (
    n: StoryUnifiedReactionBodyNode,
    inTapChain: boolean,
  ): { hit: boolean; bad: boolean } => {
    if (n.type === "output") {
      const bad =
        n.leaf.kind === "nav" &&
        n.leaf.nav.kind === "lesson_screen" &&
        !inTapChain;
      return { hit: n.leaf.kind === "nav" && n.leaf.nav.kind === "lesson_screen", bad };
    }
    if (n.type === "tap_chain") {
      return n.children.reduce(
        (acc, ch) => {
          const r = walk(ch, true);
          return { hit: acc.hit || r.hit, bad: acc.bad || r.bad };
        },
        { hit: false, bad: false },
      );
    }
    return n.children.reduce(
      (acc, ch) => {
        const r = walk(ch, inTapChain);
        return { hit: acc.hit || r.hit, bad: acc.bad || r.bad };
      },
      { hit: false, bad: false },
    );
  };
  return walk(node, false).bad;
}
