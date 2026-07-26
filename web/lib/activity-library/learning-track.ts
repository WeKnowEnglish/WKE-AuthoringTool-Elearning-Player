import {
  compileLearningTrackAsync,
  getLearningTrackComposition,
  getLearningTrackRecipe,
} from "@/lib/learning-tracks/compile-learning-track";
import {
  compositionFromRecipe,
  isLearningTrackComposition,
} from "@/lib/learning-tracks/composition";
import type { LearningTrackComposition } from "@/lib/learning-tracks/composition-types";
import type { LearningTrackLessonPlayerPack } from "@/lib/learning-tracks/composition-types";
import {
  getActivityLibraryEntry,
  newActivityLibraryId,
  putActivityLibraryEntry,
} from "./idb";
import { lessonPlayerOrigin } from "@/lib/activity-library/lesson-player-origin";
import type { ActivityLibraryEntry } from "./types";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "learning-track"
  );
}

export function validateLearningTrackPack(value: unknown): LearningTrackLessonPlayerPack {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Learning track pack must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1) throw new Error("Learning track pack must be version 1.");
  if (record.kind !== "lessonplayer-track-pack") {
    throw new Error('Expected kind "lessonplayer-track-pack".');
  }
  if (typeof record.id !== "string" || !record.id.trim()) {
    throw new Error("Track id is required.");
  }
  if (typeof record.title !== "string" || !record.title.trim()) {
    throw new Error("Track title is required.");
  }
  if (!Array.isArray(record.screens) || record.screens.length < 1) {
    throw new Error("Track needs at least one screen.");
  }
  return value as LearningTrackLessonPlayerPack;
}

/** Read a stored composition from a library entry (supports legacy recipe refs). */
export function readLearningTrackCompositionFromLibraryEntry(
  entry: ActivityLibraryEntry,
): LearningTrackComposition {
  if (entry.format !== "learning_track") {
    throw new Error("This library entry is not a learning track.");
  }
  const authoring = entry.authoring;
  if (isLearningTrackComposition(authoring)) {
    return structuredClone(authoring);
  }
  if (
    authoring &&
    typeof authoring === "object" &&
    (authoring as { kind?: unknown }).kind === "learning-track-recipe-ref" &&
    typeof (authoring as { recipeId?: unknown }).recipeId === "string"
  ) {
    const recipeId = (authoring as { recipeId: string }).recipeId;
    const composition = getLearningTrackComposition(recipeId);
    if (composition) return structuredClone(composition);
    const recipe = getLearningTrackRecipe(recipeId);
    if (recipe) return compositionFromRecipe(recipe);
    throw new Error(`Unknown track recipe "${recipeId}".`);
  }
  throw new Error("This track library entry has no editable composition.");
}

/** Compile a composition and store it in the local library. */
export async function compileAndSaveLearningTrackToLibrary(input: {
  libraryId: string | null;
  composition: LearningTrackComposition;
}): Promise<{
  entry: ActivityLibraryEntry;
  pack: LearningTrackLessonPlayerPack;
  filename: string;
  composition: LearningTrackComposition;
}> {
  const { pack, composition } = await compileLearningTrackAsync(input.composition);
  const filename = `${slugify(pack.title)}.learning-track.lessonplayer.json`;
  const now = new Date().toISOString();
  const existing = input.libraryId ? await getActivityLibraryEntry(input.libraryId) : null;
  const entry: ActivityLibraryEntry = {
    id: existing?.id ?? input.libraryId ?? newActivityLibraryId(),
    format: "learning_track",
    name: pack.title,
    updatedAt: now,
    authoring: composition,
    lastExport: {
      filename,
      pack,
      exportedAt: now,
    },
  };
  await putActivityLibraryEntry(entry);
  return { entry, pack, filename, composition };
}

export function readLearningTrackPackFromLibraryEntry(
  entry: ActivityLibraryEntry,
): LearningTrackLessonPlayerPack {
  if (entry.format !== "learning_track") {
    throw new Error("This library entry is not a learning track.");
  }
  if (!entry.lastExport?.pack) {
    throw new Error("This track has no compiled pack yet. Compile again.");
  }
  return validateLearningTrackPack(entry.lastExport.pack);
}

export function learningTrackPilotUrl(
  inboxId?: string,
  options?: { embed?: boolean; startScreen?: number },
): string {
  const base = "/pilots/learning-track";
  const params = new URLSearchParams();
  if (inboxId) params.set("inbox", inboxId);
  if (options?.embed) params.set("embed", "1");
  if (
    typeof options?.startScreen === "number" &&
    Number.isFinite(options.startScreen) &&
    options.startScreen > 0
  ) {
    params.set("start", String(Math.floor(options.startScreen)));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** Same-origin teacher preview handoff (works in production). */
export async function postLearningTrackPackToLessonPlayerInbox(input: {
  pack: unknown;
  filename: string;
}): Promise<{ inboxId: string; playUrl: string }> {
  const origin = lessonPlayerOrigin().replace(/\/$/, "");
  const body = JSON.stringify({
    format: "learning_track",
    pack: input.pack,
    filename: input.filename,
  });
  const bodyMb = body.length / (1024 * 1024);
  const response = await fetch(`${origin}/api/teacher/pack-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body,
  });

  let payload: { ok?: boolean; id?: string; playPath?: string; error?: string } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    /* ignore */
  }

  if (!response.ok || !payload.id || !payload.playPath) {
    const sizeHint =
      bodyMb > 9
        ? ` Pack is ~${bodyMb.toFixed(1)} MB (embedded vocab pictures/audio).`
        : "";
    throw new Error(
      (payload.error || `Track preview failed (${response.status}).`) + sizeHint,
    );
  }

  return {
    inboxId: payload.id,
    playUrl: payload.playPath.startsWith("http")
      ? payload.playPath
      : `${origin}${payload.playPath.startsWith("/") ? "" : "/"}${payload.playPath}`,
  };
}
