import type { GradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import {
  gradedTrackCollectionGradingPolicy,
  gradedTrackTemplateGradingPolicy,
} from "@/lib/graded-tracks/grading-policy";
import type {
  GradedTrackSegment,
  ResolvedGradedTrack,
} from "@/lib/graded-tracks/types";

export function resolveGradedTrackSegments(
  freeze: GradedTrackFreezeDocument,
): GradedTrackSegment[] {
  const collectionById = new Map(
    (freeze.collectionDocument?.parts ?? []).map((part) => [part.id, part]),
  );
  const primarySectionById = new Map(
    (freeze.primaryDocument?.sections ?? []).map((section) => [section.id, section]),
  );
  const secondaryInstanceById = new Map(
    (freeze.secondaryParts ?? []).map((part) => [part.id, part]),
  );

  return freeze.parts
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((part, index) => {
      const collectionPart = collectionById.get(part.id);
      if (collectionPart) {
        return {
          type: "collection" as const,
          partId: part.id,
          label: part.label,
          kind: part.kind,
          order: index,
          part: collectionPart,
          gradingPolicy: gradedTrackCollectionGradingPolicy(collectionPart.kind),
        };
      }

      if (freeze.level === "primary" && freeze.primaryDocument) {
        const section = primarySectionById.get(part.sectionId);
        if (section) {
          return {
            type: "primary_template" as const,
            partId: part.id,
            sectionId: part.sectionId,
            label: part.label,
            kind: part.kind,
            order: index,
            section,
            gradingPolicy: gradedTrackTemplateGradingPolicy(part.kind),
          };
        }
      }

      if (freeze.level === "secondary") {
        const instance =
          secondaryInstanceById.get(part.id) ??
          secondaryInstanceById.get(part.sectionId);
        if (instance) {
          return {
            type: "secondary_template" as const,
            partId: part.id,
            sectionId: part.sectionId,
            label: part.label,
            kind: part.kind,
            order: index,
            instance,
            gradingPolicy: gradedTrackTemplateGradingPolicy(part.kind),
          };
        }
      }

      throw new Error(
        `Could not resolve graded track segment “${part.label}”.`,
      );
    });
}

export function resolveGradedTrack(
  freeze: GradedTrackFreezeDocument,
): ResolvedGradedTrack {
  return {
    freeze,
    segments: resolveGradedTrackSegments(freeze),
  };
}
