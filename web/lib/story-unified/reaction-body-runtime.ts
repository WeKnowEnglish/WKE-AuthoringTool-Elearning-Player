import type { StoryActionSequence, StoryActionStep } from "@/lib/lesson-schemas";
import type {
  StoryUnifiedNavPayload,
  StoryUnifiedOutputLeaf,
  StoryUnifiedReactionBodyNode,
} from "@/lib/story-unified/schema";

export type CompiledUnifiedReaction = {
  sequence: StoryActionSequence;
  /** Phase / story / lesson navigation to apply after effect steps (same ordering intent as legacy completion). */
  navAfter: StoryUnifiedNavPayload | null;
};

function leafToStoryActionStep(
  leaf: Exclude<StoryUnifiedOutputLeaf, { kind: "nav" }>,
  ownerItemId: string | null,
  stepId: string,
): StoryActionStep | null {
  switch (leaf.kind) {
    case "emphasis": {
      if (!leaf.target_item_id?.trim()) return null;
      return {
        id: stepId,
        kind: "emphasis",
        target_item_id: leaf.target_item_id,
        emphasis_preset: leaf.preset,
        duration_ms: leaf.duration_ms,
      };
    }
    case "path_move": {
      if (!leaf.target_item_id?.trim()) return null;
      return {
        id: stepId,
        kind: "move",
        target_item_id: leaf.target_item_id,
        duration_ms: leaf.duration_ms,
      };
    }
    case "visibility": {
      const kind =
        leaf.op === "show" ? "show_item"
        : leaf.op === "hide" ? "hide_item"
        : "toggle_item";
      const tid = leaf.item_ids[0];
      if (!tid) return null;
      return { id: stepId, kind, target_item_id: tid };
    }
    case "play_sound":
      return {
        id: stepId,
        kind: "play_sound",
        target_item_id: leaf.target_item_id ?? ownerItemId ?? undefined,
        sound_url: leaf.sound_url,
      };
    case "speak":
      if (leaf.mode === "literal") {
        const t = leaf.text?.trim();
        if (!t) return null;
        return {
          id: stepId,
          kind: "tts",
          tts_text: t,
          tts_lang: leaf.tts_lang,
        };
      }
      if (!leaf.lines?.length) return null;
      return {
        id: stepId,
        kind: "smart_line",
        tts_lang: leaf.tts_lang,
        smart_line_lines: leaf.lines.map((line) => ({
          id: line.id,
          priority: line.priority,
          text: line.text,
          sound_url: line.sound_url,
          max_plays: line.max_plays,
          active_phase_ids: line.active_phase_ids,
        })),
      };
    case "info_popup":
      return {
        id: stepId,
        kind: "info_popup",
        target_item_id: leaf.target_item_id ?? ownerItemId ?? undefined,
        popup_title: leaf.title,
        popup_body: leaf.body,
        popup_image_url: leaf.image_url,
        popup_video_url: leaf.video_url,
      };
    default:
      return null;
  }
}

type FlatStep = { step: StoryActionStep; timing: NonNullable<StoryActionStep["timing"]> };

function compileParallel(
  node: StoryUnifiedReactionBodyNode & { type: "parallel" },
  idPrefix: string,
  ownerItemId: string | null,
): {
  steps: FlatStep[];
  navAfter: StoryUnifiedNavPayload | null;
} {
  const out: FlatStep[] = [];
  let navAfter: StoryUnifiedNavPayload | null = null;
  let i = 0;
  for (const ch of node.children) {
    const sub = compileNode(ch, `${idPrefix}p${i++}`, ownerItemId);
    for (const s of sub.steps) out.push({ step: s.step, timing: "simultaneous" });
    if (sub.navAfter) navAfter = sub.navAfter;
  }
  return { steps: out, navAfter };
}

function compileTapChain(
  node: StoryUnifiedReactionBodyNode & { type: "tap_chain" },
  idPrefix: string,
  ownerItemId: string | null,
): {
  steps: FlatStep[];
  navAfter: StoryUnifiedNavPayload | null;
} {
  const out: FlatStep[] = [];
  let navAfter: StoryUnifiedNavPayload | null = null;
  let i = 0;
  for (const ch of node.children) {
    if (ch.type === "output" && ch.leaf.kind === "nav") {
      navAfter = ch.leaf.nav;
      continue;
    }
    const sub = compileNode(ch, `${idPrefix}t${i++}`, ownerItemId);
    let first = true;
    for (const s of sub.steps) {
      out.push({
        step: s.step,
        timing: first ? "next_click" : "simultaneous",
      });
      first = false;
    }
    if (sub.navAfter) navAfter = sub.navAfter;
  }
  return { steps: out, navAfter };
}

function compileSerial(
  node: StoryUnifiedReactionBodyNode & { type: "serial" },
  idPrefix: string,
  ownerItemId: string | null,
): {
  steps: FlatStep[];
  navAfter: StoryUnifiedNavPayload | null;
} {
  const out: FlatStep[] = [];
  let navAfter: StoryUnifiedNavPayload | null = null;
  let i = 0;
  let firstInSerial = true;
  for (const ch of node.children) {
    const sub = compileNode(ch, `${idPrefix}s${i++}`, ownerItemId);
    for (const s of sub.steps) {
      out.push({
        step: s.step,
        timing: firstInSerial ? "simultaneous" : "after_previous",
      });
      firstInSerial = false;
    }
    if (sub.navAfter) navAfter = sub.navAfter;
  }
  return { steps: out, navAfter };
}

function compileNode(
  node: StoryUnifiedReactionBodyNode,
  idPrefix: string,
  ownerItemId: string | null,
): { steps: FlatStep[]; navAfter: StoryUnifiedNavPayload | null } {
  if (node.type === "output") {
    if (node.leaf.kind === "nav") {
      return { steps: [], navAfter: node.leaf.nav };
    }
    const st = leafToStoryActionStep(node.leaf, ownerItemId, `${idPrefix}:leaf`);
    if (!st) return { steps: [], navAfter: null };
    return {
      steps: [{ step: st, timing: "simultaneous" }],
      navAfter: null,
    };
  }
  if (node.type === "parallel") return compileParallel(node, idPrefix, ownerItemId);
  if (node.type === "tap_chain") return compileTapChain(node, idPrefix, ownerItemId);
  return compileSerial(node, idPrefix, ownerItemId);
}

/**
 * Compiles a unified `reaction_body` into a `StoryActionSequence` plus optional trailing navigation.
 * Used by `StoryBookView` when `NEXT_PUBLIC_STORY_UNIFIED_DISPATCH` is enabled.
 */
export function compileUnifiedReactionBody(
  sequenceId: string,
  body: StoryUnifiedReactionBodyNode,
  ownerItemId: string | null,
): CompiledUnifiedReaction {
  const { steps: flat, navAfter } = compileNode(body, sequenceId, ownerItemId);
  const steps: StoryActionStep[] = flat.map((x, idx) => ({
    ...x.step,
    id: x.step.id || `${sequenceId}:c${idx}`,
    target_item_id: x.step.target_item_id ?? ownerItemId ?? undefined,
    timing: x.timing,
  }));
  return {
    sequence: {
      id: sequenceId,
      event: "phase_enter",
      steps,
    },
    navAfter,
  };
}
