/**
 * Player-facing screen parsing. Importing through this module isolates the player from
 * teacher-only exports and lets us apply student-facing language safeguards at the final
 * parse boundary before lesson text reaches children.
 */
import {
  parseScreenPayload as parseRawScreenPayload,
  type ScreenPayload,
} from "./lesson-schemas";
import { normalizeStudentFacingPayload } from "./esl-language-quality";

export type { ScreenPayload };

export function parseScreenPayload(
  screenType: string,
  raw: unknown,
): ScreenPayload | null {
  const parsed = parseRawScreenPayload(screenType, raw);
  return parsed ? normalizeStudentFacingPayload(parsed) : null;
}
