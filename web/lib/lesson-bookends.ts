import { startPayloadSchema } from "@/lib/lesson-schemas";

/** End-of-lesson “congratulations” card (stored as `screen_type: "start"` for player compatibility). */
export function isCongratsEndScreen(screenType: string, payload: unknown): boolean {
  if (screenType !== "start") return false;
  const parsed = startPayloadSchema.safeParse(payload);
  if (!parsed.success) return false;
  return (
    (parsed.data.cta_label ?? "").trim().toLowerCase() === "finish activity" &&
    (parsed.data.read_aloud_title ?? "").trim().toLowerCase() === "congratulations"
  );
}

export function isOpeningStartScreen(screenType: string, payload: unknown): boolean {
  return screenType === "start" && !isCongratsEndScreen(screenType, payload);
}

export function buildCongratsEndPayload() {
  return startPayloadSchema.parse({
    type: "start",
    image_url: "https://placehold.co/800x520/e2e8f0/1e293b?text=Congratulations",
    image_fit: "contain",
    cta_label: "Finish activity",
    read_aloud_title: "Congratulations",
  });
}

export function buildDefaultOpeningStartPayload(lessonTitle?: string) {
  return startPayloadSchema.parse({
    type: "start",
    image_url: "https://placehold.co/800x520/e2e8f0/1e293b?text=Start",
    image_fit: "contain",
    cta_label: "Start learning",
    read_aloud_title: lessonTitle?.trim() ? lessonTitle.trim() : undefined,
  });
}

export function findOpeningStartScreen<T extends { id: string; screen_type: string; payload: unknown }>(
  screens: T[],
): T | undefined {
  return screens.find((s) => isOpeningStartScreen(s.screen_type, s.payload));
}

export function findCongratsEndScreen<T extends { id: string; screen_type: string; payload: unknown }>(
  screens: T[],
): T | undefined {
  const matches = screens.filter((s) => isCongratsEndScreen(s.screen_type, s.payload));
  return matches[matches.length - 1];
}

/**
 * Opening first, congratulations last; middle keeps the relative order from `screensOrdered`.
 */
export function normalizeLessonScreenOrderIds(
  screensOrdered: { id: string; screen_type: string; payload: unknown }[],
): string[] {
  const opening = findOpeningStartScreen(screensOrdered);
  const congrats = findCongratsEndScreen(screensOrdered);
  const pinned = new Set<string>([opening?.id, congrats?.id].filter(Boolean) as string[]);
  const middle = screensOrdered.map((s) => s.id).filter((id) => !pinned.has(id));
  const out: string[] = [];
  if (opening) out.push(opening.id);
  out.push(...middle);
  if (congrats) out.push(congrats.id);
  return out;
}
