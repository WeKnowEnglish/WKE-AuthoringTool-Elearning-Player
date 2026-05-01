import type {
  NormalizedStoryPage,
  StoryIdleAnimation,
  StoryItem,
} from "@/lib/lesson-schemas";

function idleMatchesActivePhases(
  idle: StoryIdleAnimation,
  activePhaseId: string | null,
  pageUsesExplicitPhases: boolean,
): boolean {
  const restrict = idle.active_phase_ids;
  if (!restrict || restrict.length === 0) return true;
  if (!pageUsesExplicitPhases || !activePhaseId) return false;
  return restrict.includes(activePhaseId);
}

/**
 * Returns at most one idle for the item: item-scoped beats phase-scoped beats page-scoped.
 * First matching row in each list wins (array order).
 */
export function resolveStoryIdleForItem(
  item: StoryItem,
  page: Pick<
    NormalizedStoryPage,
    "items" | "phases" | "idle_animations" | "phasesExplicit"
  >,
  activePhaseId: string | null,
): StoryIdleAnimation | null {
  const pageUsesExplicitPhases = page.phasesExplicit;

  const ok = (idle: StoryIdleAnimation) =>
    idleMatchesActivePhases(idle, activePhaseId, pageUsesExplicitPhases);

  for (const idle of item.idle_animations ?? []) {
    if (ok(idle)) return idle;
  }

  if (pageUsesExplicitPhases && activePhaseId) {
    const phase = page.phases.find((p) => p.id === activePhaseId);
    for (const idle of phase?.idle_animations ?? []) {
      if (idle.target_item_id !== item.id) continue;
      if (ok(idle)) return idle;
    }
  }

  for (const idle of page.idle_animations ?? []) {
    if (idle.target_item_id !== item.id) continue;
    if (ok(idle)) return idle;
  }

  return null;
}

/** CSS class for preset (underscores preserved). */
export function storyIdleClassForPreset(preset: StoryIdleAnimation["preset"]): string {
  return `story-idle-${preset}`;
}
