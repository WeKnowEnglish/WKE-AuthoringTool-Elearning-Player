/**
 * Player-facing screen parsing. Re-exports from lesson-schemas today; importing through this
 * module isolates the player from teacher-only exports and leaves room to split Zod subtrees
 * later so the lesson player chunk does not pull authoring-only schema helpers.
 */
export { parseScreenPayload, type ScreenPayload } from "./lesson-schemas";
