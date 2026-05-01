import type { LessonScreenRow } from "@/lib/data/catalog";
import {
  getNormalizedStoryPages,
  parseScreenPayload,
  type StoryPayload,
} from "@/lib/lesson-schemas";

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

export type ChecklistItem = { ok: boolean; label: string };

export function lessonPublishChecklist(input: {
  published: boolean;
  screens: LessonScreenRow[];
}): ChecklistItem[] {
  const { published, screens } = input;
  const hasStart = screens.some((s) => s.screen_type === "start");
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
  const items: ChecklistItem[] = [
    { ok: screens.length > 0, label: "At least one screen" },
    { ok: hasStart, label: "Has a Start screen (recommended)" },
    { ok: !emptyInteraction, label: "Interactions have prompts/questions filled in" },
    { ok: !emptyStory, label: "Stories have text or a visual on the first page" },
    {
      ok: !storyPhaseIssues,
      label: "Story pages with phases: one start phase and valid “next” links",
    },
  ];
  if (published) {
    items.push({
      ok: hasStart && screens.length > 0,
      label: "Published lessons should be complete before students see them",
    });
  }
  return items;
}
