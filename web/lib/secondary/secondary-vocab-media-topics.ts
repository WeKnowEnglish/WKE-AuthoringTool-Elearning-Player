/** `media_assets.meta_categories` slugs used when resolving secondary vocab illustrations. */
export const SECONDARY_TOPIC_MEDIA_SLUGS: Record<string, readonly string[]> = {
  "school-life": ["school", "actions", "people"],
  "daily-routines": ["actions", "home", "food"],
  personality: ["people", "emotions", "actions"],
  "feelings-opinions": ["emotions", "people", "actions"],
  "food-health": ["food", "body", "drinks"],
  "places-directions": ["places", "nature", "actions"],
  "technology-online-life": ["school", "actions", "misc"],
  environment: ["nature", "animals", "weather"],
  "stories-past-events": ["actions", "people"],
  "future-plans-jobs": ["jobs", "people", "school"],
  "social-life-communication": ["people", "actions"],
  "academic-classroom-language": ["school", "actions"],
};

export function getSecondaryVocabMediaTopicSlugs(topicId: string): readonly string[] {
  return SECONDARY_TOPIC_MEDIA_SLUGS[topicId] ?? ["misc", "actions"];
}
