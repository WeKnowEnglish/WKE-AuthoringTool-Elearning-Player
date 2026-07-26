import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import { validateStudioActivityPack } from "@/lib/studio-activities/validate";

/**
 * Freeze a bank pack for Space (or later homework): re-validate and deep-clone
 * so later Studio edits do not mutate the published snapshot.
 */
export function freezeStudioPackForSpace(
  format: StudioActivityFormat,
  pack: unknown,
  titleHint?: string | null,
): { format: StudioActivityFormat; title: string; pack: Record<string, unknown> } {
  const validated = validateStudioActivityPack(format, pack);
  const title =
    titleHint?.trim() ||
    validated.defaultTitle ||
    "Activity";
  return {
    format,
    title: title.slice(0, 160),
    pack: structuredClone(validated.pack),
  };
}
