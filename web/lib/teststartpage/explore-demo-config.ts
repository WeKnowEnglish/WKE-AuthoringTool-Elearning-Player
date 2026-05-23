import { explorePayloadSchema, type ExplorePayload } from "@/lib/lesson-schemas";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";

/** Bundled Explore demo for Test Start (matches teacher template). */
export function getExploreDemoPayload(): ExplorePayload {
  return explorePayloadSchema.parse(rawInteractionTemplateForSubtype("explore"));
}
