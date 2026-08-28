import type { GradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import type { HomeworkCollectionPart } from "@/lib/homework-collections";
import type { HomeworkTemplateOne } from "@/lib/homework-templates/homework-template-one";
import type { SecondaryHomeworkPartInstance } from "@/lib/homework-templates/secondary-homework-one";
import type { GradedActivityPolicy } from "@/lib/graded-activities";

export type GradedTrackCollectionSegment = {
  type: "collection";
  partId: string;
  label: string;
  kind: string;
  order: number;
  part: HomeworkCollectionPart;
  gradingPolicy: GradedActivityPolicy;
};

export type GradedTrackPrimaryTemplateSegment = {
  type: "primary_template";
  partId: string;
  sectionId: string;
  label: string;
  kind: string;
  order: number;
  section: HomeworkTemplateOne["sections"][number];
  gradingPolicy: GradedActivityPolicy;
};

export type GradedTrackSecondaryTemplateSegment = {
  type: "secondary_template";
  partId: string;
  sectionId: string;
  label: string;
  kind: string;
  order: number;
  instance: SecondaryHomeworkPartInstance;
  gradingPolicy: GradedActivityPolicy;
};

export type GradedTrackSegment =
  | GradedTrackCollectionSegment
  | GradedTrackPrimaryTemplateSegment
  | GradedTrackSecondaryTemplateSegment;

export type ResolvedGradedTrack = {
  freeze: GradedTrackFreezeDocument;
  segments: GradedTrackSegment[];
};
