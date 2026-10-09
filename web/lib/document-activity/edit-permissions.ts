import { canEditActivityWork } from "@/lib/activity-runtime/activity-permissions";

/** Whole-class writing includes the teacher; private student work stays inspect-only. */
export function canEditDocumentWork(input: Parameters<typeof canEditActivityWork>[0] & {
  participationMode: string;
}): boolean {
  if (input.role === "host" && input.participationMode === "whole_class") {
    return canEditActivityWork({ ...input, role: "player", isOwner: true });
  }
  return canEditActivityWork(input);
}
