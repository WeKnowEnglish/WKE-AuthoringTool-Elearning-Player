/** Pure helpers for story `pass_rule` (student player + tests). */

export type StoryPageForPass = {
  id: string;
  items: Array<{
    id: string;
    draggable_mode?: "none" | "free" | "check_target";
    drop_target_id?: string;
  }>;
};

export function getStoryCheckTargetDraggables(pages: StoryPageForPass[]) {
  return pages.flatMap((p) =>
    p.items.filter((it) => it.draggable_mode === "check_target" && !!it.drop_target_id),
  );
}

export function isStoryPassSatisfied(input: {
  pass_rule?: "story_complete" | "visit_all_pages" | "drag_targets_complete";
  pages: StoryPageForPass[];
  dragCheckDone: Record<string, boolean>;
  visitedPageIds: Record<string, true>;
}): boolean {
  const { pass_rule, pages, dragCheckDone, visitedPageIds } = input;
  if (!pass_rule) return true;
  if (pass_rule === "visit_all_pages" || pass_rule === "story_complete") {
    return pages.length > 0 && pages.every((p) => !!visitedPageIds[p.id]);
  }
  const draggable = getStoryCheckTargetDraggables(pages);
  if (draggable.length === 0) return true;
  return draggable.every((it) => !!dragCheckDone[it.id]);
}
