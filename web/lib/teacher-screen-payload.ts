import { revalidatePath } from "next/cache";
import {
  interactionPayloadSchema,
  startPayloadSchema,
  storyPayloadSchema,
} from "@/lib/lesson-schemas";

type SupabaseLike = {
  from: (table: string) => any;
};

export type PersistTeacherScreenPayloadInput = {
  screenId: string;
  lessonId: string;
  moduleId: string;
  screenType: string;
  payloadJson: string;
};

export function parseScreenPayloadForStore(screenType: string, payloadJson: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    throw new Error("Invalid JSON");
  }

  if (screenType === "start") {
    return startPayloadSchema.parse(parsed);
  }
  if (screenType === "story") {
    return storyPayloadSchema.parse(parsed);
  }
  if (screenType === "interaction") {
    return interactionPayloadSchema.parse(parsed);
  }
  throw new Error("Unknown screen type");
}

export async function persistTeacherScreenPayload(
  supabase: SupabaseLike,
  input: PersistTeacherScreenPayloadInput,
): Promise<void> {
  const toStore = parseScreenPayloadForStore(input.screenType, input.payloadJson);
  const { data, error } = await supabase
    .from("lesson_screens")
    .update({ payload: toStore, updated_at: new Date().toISOString() })
    .eq("id", input.screenId)
    .eq("lesson_id", input.lessonId)
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    throw new Error("Screen was not updated (no matching row — check screen id and lesson).");
  }
  revalidatePath(`/teacher/modules/${input.moduleId}/lessons/${input.lessonId}`);
}
