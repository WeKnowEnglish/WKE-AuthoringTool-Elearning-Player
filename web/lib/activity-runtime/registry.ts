import {
  VC_ACTIVITY_KIND_META,
  type VirtualClassroomActivityKind,
} from "@/lib/activity-runtime/activity-types";
import {
  DOCUMENT_INTERACTION_CONFIG,
  WHITEBOARD_INTERACTION_CONFIG,
  type ActivityInteractionConfig,
} from "@/lib/activity-runtime/activity-interaction-config";

export type RegisteredVcActivity = {
  kind: VirtualClassroomActivityKind;
  label: string;
  description: string;
  /** Chunk 1+ for document; whiteboard already enabled. */
  enabled: boolean;
  interaction: ActivityInteractionConfig;
  teacherLaunchHint: string;
  studentJoinHint: string;
};

const REGISTRY: RegisteredVcActivity[] = [
  {
    kind: "whiteboard",
    label: VC_ACTIVITY_KIND_META.whiteboard.label,
    description: VC_ACTIVITY_KIND_META.whiteboard.description,
    enabled: true,
    interaction: WHITEBOARD_INTERACTION_CONFIG,
    teacherLaunchHint:
      "Configure mode, worksheet, and timer in the Virtual Classroom whiteboard panel",
    studentJoinHint: "Enter whiteboard when the teacher launches it",
  },
  {
    kind: "document",
    label: VC_ACTIVITY_KIND_META.document.label,
    description: VC_ACTIVITY_KIND_META.document.description,
    /** Enabled for registry/routing; launch UI lands in Chunk 1. */
    enabled: true,
    interaction: DOCUMENT_INTERACTION_CONFIG,
    teacherLaunchHint: "Start document from Virtual Classroom (Chunk 1+)",
    studentJoinHint: "Enter document when the teacher launches it",
  },
];

export function listVcActivities(): RegisteredVcActivity[] {
  return [...REGISTRY];
}

export function listEnabledVcActivities(): RegisteredVcActivity[] {
  return REGISTRY.filter((a) => a.enabled);
}

export function getVcActivity(
  kind: VirtualClassroomActivityKind,
): RegisteredVcActivity | undefined {
  return REGISTRY.find((a) => a.kind === kind);
}

export function isRegisteredVcActivity(
  kind: string,
): kind is VirtualClassroomActivityKind {
  return kind === "whiteboard" || kind === "document";
}
