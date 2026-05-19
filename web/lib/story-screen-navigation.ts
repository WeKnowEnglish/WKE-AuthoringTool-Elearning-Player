/**
 * Whether the learner may leave a story screen via Next / swipe (last page → parent).
 * Vocabulary story screens use `auto_advance_on_pass` without `pass_rule`.
 */
export function canLeaveStoryScreen(input: {
  hasPassRule: boolean;
  autoAdvanceOnPass: boolean;
  interactionScreenPassed: boolean;
  passSatisfied: boolean;
}): boolean {
  if (input.interactionScreenPassed) return true;
  if (input.hasPassRule && input.passSatisfied) return true;
  const mustPassExplicitly = input.hasPassRule || input.autoAdvanceOnPass;
  return !mustPassExplicitly;
}
