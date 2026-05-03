import type { LessonScreenRow } from "@/lib/data/catalog";
import { getQuizGroupIdFromPayload } from "@/lib/lesson-activity-taxonomy";
import {
  getNormalizedStoryPages,
  parseScreenPayload,
  type StoryPayload,
} from "@/lib/lesson-schemas";
import { buildUnifiedReactionsFromStoryPage } from "@/lib/story-unified/build-unified-reactions";

function storyPhasesLookBroken(p: StoryPayload): boolean {
  if (!p.pages?.length) return false;
  const itemIds = (pg: { items: { id: string }[] }) =>
    new Set(pg.items.map((x) => x.id));
  for (const pg of p.pages) {
    if (!pg.phases?.length) continue;
    const starts = pg.phases.filter((x) => x.is_start);
    if (starts.length !== 1) return true;
    const ids = new Set(pg.phases.map((x) => x.id));
    const items = itemIds(pg);
    for (const ph of pg.phases) {
      if (ph.next_phase_id && !ids.has(ph.next_phase_id)) return true;
      if (ph.completion?.type === "on_click") {
        if (!items.has(ph.completion.target_item_id)) return true;
        if (!ids.has(ph.completion.next_phase_id)) return true;
      }
      if (ph.completion?.type === "auto" && !ids.has(ph.completion.next_phase_id)) {
        return true;
      }
      if (ph.completion?.type === "all_matched" && !ids.has(ph.completion.next_phase_id)) {
        return true;
      }
      if (ph.completion?.type === "sequence_complete") {
        if (!ids.has(ph.completion.next_phase_id)) return true;
        const sid = ph.completion.sequence_id;
        const seqOk = pg.items.some((it) => {
          for (const seq of it.action_sequences ?? []) {
            if (seq.event === "click" && seq.id === sid) return true;
          }
          if (
            sid === `legacy:item:${it.id}:triggers` &&
            (it.on_click?.triggers?.length ?? 0) > 0
          ) {
            return true;
          }
          return false;
        });
        if (!seqOk) return true;
      }
      if (ph.completion?.type === "tap_group") {
        if (!ids.has(ph.completion.next_phase_id)) return true;
        const gid = ph.completion.group_id;
        const ok = pg.items.some((it) => it.tap_interaction_group?.id === gid);
        if (!ok) return true;
      }
      if (ph.completion?.type === "pool_interaction_quota") {
        if (!ids.has(ph.completion.next_phase_id)) return true;
        for (const pid of ph.completion.pool_item_ids) {
          if (!items.has(pid)) return true;
        }
      }
      if (ph.kind === "drag_match" && !ph.drag_match) {
        return true;
      }
      for (const row of ph.on_enter ?? []) {
        if (row.item_id && !items.has(row.item_id)) return true;
        for (const iid of row.item_ids ?? []) {
          if (!items.has(iid)) return true;
        }
        if (row.action === "play_sound" && !row.sound_url?.trim()) {
          return true;
        }
      }
    }
  }
  return false;
}

/** True when unified IR compiler reports parse errors or error-level validation on any story page. */
function storyUnifiedIrHardFailures(story: StoryPayload): boolean {
  const pages = getNormalizedStoryPages(story);
  for (const page of pages) {
    const { parseErrors, issues } = buildUnifiedReactionsFromStoryPage(page);
    if (parseErrors.length > 0) return true;
    if (issues.some((i) => i.level === "error")) return true;
  }
  return false;
}

export type ChecklistItem = { ok: boolean; label: string };

type LessonScreenEval = {
  hasScreens: boolean;
  hasStart: boolean;
  hasUnparsablePayload: boolean;
  unparsableOrderIndices: number[];
  emptyInteraction: boolean;
  emptyStory: boolean;
  storyPhaseIssues: boolean;
  quizMultiMissingTitle: boolean;
  quizTitleInconsistent: boolean;
  storyUnifiedIrFailures: boolean;
};

function evaluateLessonScreens(screens: LessonScreenRow[]): LessonScreenEval {
  const hasScreens = screens.length > 0;
  const hasStart = screens.some((s) => s.screen_type === "start");
  const unparsableOrderIndices: number[] = [];
  for (const s of screens) {
    const p = parseScreenPayload(s.screen_type, s.payload);
    if (!p) unparsableOrderIndices.push(s.order_index);
  }
  const hasUnparsablePayload = unparsableOrderIndices.length > 0;

  const emptyInteraction = screens.some((s) => {
    const p = parseScreenPayload(s.screen_type, s.payload);
    if (!p || p.type !== "interaction") return false;
    if (p.subtype === "mc_quiz" && !p.question?.trim()) return true;
    if (p.subtype === "short_answer" && !p.prompt?.trim()) return true;
    if (p.subtype === "essay" && !p.prompt?.trim()) return true;
    return false;
  });

  const emptyStory = screens.some((s) => {
    const p = parseScreenPayload(s.screen_type, s.payload);
    if (!p || p.type !== "story") return false;
    const pages = getNormalizedStoryPages(p);
    const first = pages[0];
    const hasText = !!(first.body_text?.trim() || p.body_text?.trim());
    const hasVisual =
      !!(first.background_image_url ?? first.video_url ?? p.image_url ?? p.video_url) ||
      first.items.length > 0;
    return !hasText && !hasVisual;
  });

  const storyPhaseIssues = screens.some((s) => {
    const p = parseScreenPayload(s.screen_type, s.payload);
    if (!p || p.type !== "story") return false;
    return storyPhasesLookBroken(p);
  });

  const quizMultiMissingTitle = (() => {
    const byGid = new Map<string, LessonScreenRow[]>();
    for (const s of screens) {
      const gid = getQuizGroupIdFromPayload(s.payload);
      if (!gid) continue;
      const list = byGid.get(gid) ?? [];
      list.push(s);
      byGid.set(gid, list);
    }
    for (const list of byGid.values()) {
      if (list.length <= 1) continue;
      const title = (list[0].payload as { quiz_group_title?: string }).quiz_group_title?.trim();
      if (!title) return true;
    }
    return false;
  })();

  const storyUnifiedIrFailures = screens.some((s) => {
    if (s.screen_type !== "story") return false;
    const p = parseScreenPayload("story", s.payload);
    if (!p || p.type !== "story") return false;
    return storyUnifiedIrHardFailures(p);
  });

  const quizTitleInconsistent = (() => {
    const byGid = new Map<string, LessonScreenRow[]>();
    for (const s of screens) {
      const gid = getQuizGroupIdFromPayload(s.payload);
      if (!gid) continue;
      const list = byGid.get(gid) ?? [];
      list.push(s);
      byGid.set(gid, list);
    }
    for (const list of byGid.values()) {
      if (list.length <= 1) continue;
      const titles = list.map(
        (s) => (s.payload as { quiz_group_title?: string }).quiz_group_title?.trim() ?? "",
      );
      if (new Set(titles).size > 1) return true;
    }
    return false;
  })();

  return {
    hasScreens,
    hasStart,
    hasUnparsablePayload,
    unparsableOrderIndices,
    emptyInteraction,
    emptyStory,
    storyPhaseIssues,
    quizMultiMissingTitle,
    quizTitleInconsistent,
    storyUnifiedIrFailures,
  };
}

/** Human-readable reasons that prevent publishing (server + editor must stay in sync). */
export function getLessonPublishBlockingReasons(screens: LessonScreenRow[]): string[] {
  const e = evaluateLessonScreens(screens);
  const reasons: string[] = [];
  if (!e.hasScreens) reasons.push("Add at least one screen.");
  if (!e.hasStart) reasons.push("Add a Start screen before publishing.");
  if (e.hasUnparsablePayload) {
    reasons.push(
      `Fix invalid screen payload(s) at order index: ${e.unparsableOrderIndices.join(", ")}. Students cannot load those screens.`,
    );
  }
  if (e.emptyInteraction) {
    reasons.push("Fill in every interaction prompt or question (empty quiz / short answer / essay detected).");
  }
  if (e.emptyStory) {
    reasons.push("Add text or a visual on the first page of every story screen.");
  }
  if (e.storyPhaseIssues) {
    reasons.push(
      "Fix story phases: each phased page needs exactly one start phase and valid next-phase links.",
    );
  }
  if (e.quizMultiMissingTitle) {
    reasons.push("Set a quiz title on the first question of every multi-question quiz.");
  }
  if (e.quizTitleInconsistent) {
    reasons.push("Use the same quiz title for every question in each quiz group.");
  }
  if (e.storyUnifiedIrFailures) {
    reasons.push(
      "Fix unified story reaction IR: one or more story pages fail the compiler or have error-level validation (see `web/lib/story-unified/README.md`).",
    );
  }
  return reasons;
}

export function lessonPublishChecklist(input: {
  published: boolean;
  screens: LessonScreenRow[];
}): ChecklistItem[] {
  const { published, screens } = input;
  const e = evaluateLessonScreens(screens);
  const blockingReasons = getLessonPublishBlockingReasons(screens);

  const items: ChecklistItem[] = [
    { ok: e.hasScreens, label: "At least one screen" },
    { ok: e.hasStart, label: "Has a Start screen (required to publish)" },
    { ok: !e.hasUnparsablePayload, label: "Every screen’s payload is valid for its type" },
    { ok: !e.emptyInteraction, label: "Interactions have prompts/questions filled in" },
    { ok: !e.emptyStory, label: "Stories have text or a visual on the first page" },
    {
      ok: !e.storyPhaseIssues,
      label: "Story pages with phases: one start phase and valid “next” links",
    },
    {
      ok: !e.quizMultiMissingTitle,
      label: "Quizzes with 2+ questions have a quiz title (first question)",
    },
    {
      ok: !e.quizTitleInconsistent,
      label: "Each quiz uses one consistent title across all questions in the group",
    },
    {
      ok: !e.storyUnifiedIrFailures,
      label: "Stories compile to unified reaction IR (no compiler/validation errors)",
    },
  ];
  if (published) {
    items.push({
      ok: blockingReasons.length === 0,
      label: "Published lesson has no blocking issues for students",
    });
  }
  return items;
}
