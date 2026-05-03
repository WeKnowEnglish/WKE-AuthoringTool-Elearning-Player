import type { StoryUnifiedTrigger } from "@/lib/story-unified/schema";

export type AddReactionMode =
  | "page_start"
  | "phase_start"
  | "item_click"
  | "phase_pool"
  | "item_pool";

export type AddReactionOption = {
  id: AddReactionMode;
  label: string;
  enabled: boolean;
  reasonWhenDisabled?: string;
};

export function triggerIcon(trigger: StoryUnifiedTrigger): string {
  if (trigger === "phase_enter") return "Start";
  if (trigger === "item_click") return "Tap";
  if (trigger === "pool_quota_met") return "Pool";
  if (trigger === "all_drag_matched") return "Drag";
  if (trigger === "timer") return "Timer";
  return "Done";
}

export function defaultAddReactionMode(input: {
  selectedItemId: string | null;
  selectedPhaseId: string | null;
  hasAnyItems: boolean;
  hasAnyPhases: boolean;
}): AddReactionMode {
  if (input.selectedItemId) return "item_click";
  if (input.selectedPhaseId && input.hasAnyPhases) return "phase_start";
  if (input.hasAnyItems) return "item_click";
  return "page_start";
}

export function buildAddReactionOptions(input: {
  selectedItemId: string | null;
  hasAnyItems: boolean;
  hasAnyPhases: boolean;
  hasAnyTapGroupParent: boolean;
}): AddReactionOption[] {
  return [
    { id: "page_start", label: "Add: page start", enabled: true },
    {
      id: "phase_start",
      label: "Add: phase start",
      enabled: input.hasAnyPhases,
      reasonWhenDisabled: "Add phases first",
    },
    {
      id: "item_click",
      label: "Add: item tap",
      enabled: input.hasAnyItems,
      reasonWhenDisabled: "Add at least one object",
    },
    {
      id: "phase_pool",
      label: "Add: phase pool done",
      enabled: input.hasAnyPhases,
      reasonWhenDisabled: "Add phases first",
    },
    {
      id: "item_pool",
      label: "Add: item pool done",
      enabled: !!input.selectedItemId || input.hasAnyTapGroupParent,
      reasonWhenDisabled: "Select an object with a tap pool",
    },
  ];
}
