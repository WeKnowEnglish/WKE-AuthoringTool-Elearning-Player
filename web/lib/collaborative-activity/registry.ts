import {
  ACTIVITY_KIND_META,
  type CollaborativeActivityKind,
} from "@/lib/collaborative-activity/domain";

export type RegisteredActivity = {
  kind: CollaborativeActivityKind;
  label: string;
  description: string;
  enabled: boolean;
  productJoinPath: string;
  teacherStartHint: string;
};

const REGISTRY: Omit<RegisteredActivity, "label" | "description">[] = [
  {
    kind: "whiteboard",
    enabled: true,
    productJoinPath: "/whiteboard/join",
    teacherStartHint: "Start from the class whiteboard panel",
  },
  {
    kind: "sentence_strip",
    enabled: true,
    productJoinPath: "/activity/sentence-strip/join",
    teacherStartHint: "Start a sentence-strip round from the class page",
  },
  {
    kind: "shared_table",
    enabled: false,
    productJoinPath: "/activity/join",
    teacherStartHint: "Coming soon",
  },
  {
    kind: "role_cards",
    enabled: false,
    productJoinPath: "/activity/join",
    teacherStartHint: "Coming soon",
  },
  {
    kind: "quiz_race",
    enabled: false,
    productJoinPath: "/activity/join",
    teacherStartHint: "Coming soon",
  },
];

export function listRegisteredActivities(): RegisteredActivity[] {
  return REGISTRY.map((entry) => ({
    ...entry,
    label: ACTIVITY_KIND_META[entry.kind].label,
    description: ACTIVITY_KIND_META[entry.kind].description,
  }));
}

export function getRegisteredActivity(
  kind: CollaborativeActivityKind,
): RegisteredActivity | undefined {
  return listRegisteredActivities().find((entry) => entry.kind === kind);
}

export function listEnabledActivities(): RegisteredActivity[] {
  return listRegisteredActivities().filter((entry) => entry.enabled);
}
