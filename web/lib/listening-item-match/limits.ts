/** Authoring and playback limits for Listen and match activities. */

export const LISTENING_ITEM_MATCH_MIN_PROMPTS = 1;
export const LISTENING_ITEM_MATCH_MAX_PROMPTS = 12;
export const LISTENING_ITEM_MATCH_MIN_CHOICES = 2;
export const LISTENING_ITEM_MATCH_MAX_CHOICES = 12;

export function listeningItemMatchCountIssues(input: {
  promptCount: number;
  choiceCount: number;
}): string[] {
  const issues: string[] = [];
  const { promptCount, choiceCount } = input;
  if (
    promptCount < LISTENING_ITEM_MATCH_MIN_PROMPTS ||
    promptCount > LISTENING_ITEM_MATCH_MAX_PROMPTS
  ) {
    issues.push(
      `Add between ${LISTENING_ITEM_MATCH_MIN_PROMPTS} and ${LISTENING_ITEM_MATCH_MAX_PROMPTS} prompts to match.`,
    );
  }
  if (
    choiceCount < LISTENING_ITEM_MATCH_MIN_CHOICES ||
    choiceCount > LISTENING_ITEM_MATCH_MAX_CHOICES
  ) {
    issues.push(
      `Add between ${LISTENING_ITEM_MATCH_MIN_CHOICES} and ${LISTENING_ITEM_MATCH_MAX_CHOICES} choices.`,
    );
  }
  if (
    promptCount >= LISTENING_ITEM_MATCH_MIN_PROMPTS &&
    choiceCount >= LISTENING_ITEM_MATCH_MIN_CHOICES &&
    choiceCount < promptCount
  ) {
    issues.push(
      "You need at least as many choices as prompts (extra choices can be distractors).",
    );
  }
  return issues;
}
