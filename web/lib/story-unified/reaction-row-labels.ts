import type {
  StoryUnifiedNavPayload,
  StoryUnifiedOutputLeaf,
  StoryUnifiedReactionBodyNode,
  StoryUnifiedReactionRow,
} from "@/lib/story-unified/schema";

export type ReactionLabelContext = {
  phaseNameById?: Map<string, string>;
  itemNameById?: Map<string, string>;
};

function phaseLabel(phaseId: string, ctx: ReactionLabelContext): string {
  return ctx.phaseNameById?.get(phaseId) ?? phaseId;
}

function itemLabel(itemId: string | undefined, ctx: ReactionLabelContext): string {
  if (!itemId) return "item";
  return ctx.itemNameById?.get(itemId) ?? itemId;
}

function navLabel(nav: StoryUnifiedNavPayload): string {
  if (nav.kind === "next_phase") return "Next phase";
  if (nav.kind === "phase_id") return `Go to phase ${nav.phase_id}`;
  if (nav.kind === "story_page") {
    if (nav.target === "next") return "Next page";
    if (nav.target === "prev") return "Previous page";
    if (nav.page_id) return `Go to page ${nav.page_id}`;
    return "Go to page";
  }
  if (nav.kind === "lesson_screen") return "Next lesson screen";
  if (nav.kind === "lesson_pass") return "Mark lesson pass";
  return "End phase";
}

function outputLeafLabel(leaf: StoryUnifiedOutputLeaf): string {
  if (leaf.kind === "emphasis") return "Emphasis";
  if (leaf.kind === "path_move") return "Path move";
  if (leaf.kind === "visibility") {
    if (leaf.op === "show") return "Show item";
    if (leaf.op === "hide") return "Hide item";
    return "Toggle item";
  }
  if (leaf.kind === "play_sound") return "Play sound";
  if (leaf.kind === "speak") return "Speak";
  if (leaf.kind === "info_popup") return "Info popup";
  return navLabel(leaf.nav);
}

export function collectOutputLeaves(node: StoryUnifiedReactionBodyNode): StoryUnifiedOutputLeaf[] {
  if (node.type === "output") return [node.leaf];
  return node.children.flatMap((ch) => collectOutputLeaves(ch));
}

export function summarizeReactionBody(
  body: StoryUnifiedReactionBodyNode,
  opts?: { maxLeaves?: number },
): string {
  const leaves = collectOutputLeaves(body);
  if (leaves.length === 0) return "No outputs";
  const maxLeaves = Math.max(1, opts?.maxLeaves ?? 4);
  const labels = leaves.slice(0, maxLeaves).map(outputLeafLabel);
  if (leaves.length > maxLeaves) labels.push(`+${leaves.length - maxLeaves} more`);
  return labels.join(" -> ");
}

export function reactionTriggerLabel(
  row: StoryUnifiedReactionRow,
  ctx: ReactionLabelContext = {},
): string {
  const ph = phaseLabel(row.phase_id, ctx);
  if (row.trigger === "phase_enter") return `Phase start · ${ph}`;
  if (row.trigger === "item_click") return `Tap · ${itemLabel(row.owner_item_id, ctx)} · ${ph}`;
  if (row.trigger === "pool_quota_met") return `Pool complete · ${ph}`;
  if (row.trigger === "all_drag_matched") return `All drag matched · ${ph}`;
  if (row.trigger === "timer") {
    const ms = row.timer_delay_ms ?? 0;
    const s = (ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1);
    return `Timer ${s}s · ${ph}`;
  }
  if (row.advance_after_sequence_id?.trim()) {
    return `After sequence ${row.advance_after_sequence_id} · ${ph}`;
  }
  return `After item sequence · ${itemLabel(row.owner_item_id, ctx)} · ${ph}`;
}
