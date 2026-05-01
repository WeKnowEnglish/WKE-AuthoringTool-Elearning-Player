/** Pure helpers for presentation_interactive pass_rule (student player + tests). */

export type PresentationSlideForPass = {
  id: string;
  elements: Array<{
    id: string;
    draggable_mode?: "none" | "free" | "check_target";
    drop_target_id?: string;
  }>;
};

export function getPresentationCheckTargetDraggables(slides: PresentationSlideForPass[]) {
  return slides.flatMap((s) =>
    s.elements.filter((el) => el.draggable_mode === "check_target" && !!el.drop_target_id),
  );
}

export function isPresentationInteractionPassSatisfied(input: {
  pass_rule?: "drag_targets_complete" | "visit_all_slides";
  slides: PresentationSlideForPass[];
  dragCheckDone: Record<string, boolean>;
  visitedSlides: Record<string, true>;
}): boolean {
  const { pass_rule, slides, dragCheckDone, visitedSlides } = input;
  if ((pass_rule ?? "drag_targets_complete") === "visit_all_slides") {
    return slides.length > 0 && slides.every((s) => !!visitedSlides[s.id]);
  }
  const draggable = getPresentationCheckTargetDraggables(slides);
  if (draggable.length === 0) return true;
  return draggable.every((el) => !!dragCheckDone[el.id]);
}
