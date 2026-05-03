/**
 * Feature flags for the unified story reaction pipeline (`web/lib/story-unified/`).
 *
 * Stage 0: scaffold only — default off so behavior is unchanged.
 * Stage 3: StoryBookView reads this and routes through `applyStoryReactions` when enabled.
 */
export function isStoryUnifiedDispatchEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_STORY_UNIFIED_DISPATCH?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
