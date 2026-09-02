"use server";

import { revalidatePath } from "next/cache";
import { isStudent } from "@/lib/auth/roles";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { creativePresentationMediaIds } from "@/lib/homework-collections";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const BUCKET = "homework_media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SaveResult =
  | { ok: true; mediaId: string; url: string }
  | { ok: false; error: string };

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
}

export async function saveHomeworkCollectionMedia(formData: FormData): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !isStudent(user)) {
      return { ok: false, error: "Student authentication required." };
    }

    const homeworkId = String(formData.get("homework_id") ?? "").trim();
    const partId = String(formData.get("part_id") ?? "").trim();
    const slotId = String(formData.get("slot_id") ?? "").trim();
    const upload = formData.get("file");
    if (!homeworkId || !partId || !slotId) {
      return { ok: false, error: "This picture space is missing." };
    }
    if (!upload || typeof upload === "string" || !(upload instanceof Blob)) {
      return { ok: false, error: "Choose a picture or finish your drawing first." };
    }
    const file = upload as File;
    const contentType = file.type.split(";")[0]?.toLowerCase() || "";
    if (!ALLOWED_IMAGES.has(contentType)) {
      return { ok: false, error: "Use a JPG, PNG, or WebP picture." };
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return { ok: false, error: "The picture must be smaller than 5 MB." };
    }

    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id,class_id,status,payload,target_student_ids")
      .eq("id", homeworkId)
      .maybeSingle();
    if (homeworkError) return { ok: false, error: homeworkError.message };
    const payload = normalizeHomeworkPayload(homework?.payload);
    if (!homework || homework.status !== "assigned" || payload?.type !== "graded_track") {
      return { ok: false, error: "This homework is not open." };
    }
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    const part = freeze?.collectionDocument?.parts.find((entry) => entry.id === partId);
    if (!part || part.kind !== "creative_presentation" || !creativePresentationMediaIds(part).includes(slotId)) {
      return { ok: false, error: "This picture is not part of the VLOG task." };
    }

    const { data: memberships, error: membershipError } = await supabase.rpc(
      "student_class_memberships",
    );
    if (membershipError) return { ok: false, error: membershipError.message };
    if (!((memberships ?? []) as Array<{ class_id: string }>).some(
      (row) => row.class_id === homework.class_id,
    )) {
      return { ok: false, error: "You are not enrolled in this class." };
    }
    const targets = Array.isArray(homework.target_student_ids)
      ? homework.target_student_ids.filter((id): id is string => typeof id === "string")
      : null;
    if (targets && !targets.includes(user.id)) {
      return { ok: false, error: "This homework was not assigned to you." };
    }

    const admin = createServiceRoleSupabase();
    if (!admin) return { ok: false, error: "Picture uploads are not configured." };
    const { data: previous, error: previousError } = await admin
      .from("homework_collection_media")
      .select("id,storage_path")
      .eq("homework_id", homeworkId)
      .eq("student_id", user.id)
      .eq("part_id", partId)
      .eq("slot_id", slotId)
      .maybeSingle();
    if (previousError && /homework_collection_media|schema cache|does not exist/i.test(previousError.message)) {
      return { ok: false, error: "Picture uploads require migration 142." };
    }
    if (previousError) return { ok: false, error: previousError.message };

    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1] || "png";
    const storagePath = [
      safeSegment(homeworkId),
      user.id,
      safeSegment(partId),
      `${safeSegment(slotId)}-${crypto.randomUUID()}.${extension}`,
    ].join("/");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType, upsert: false });
    if (uploadError) return { ok: false, error: uploadError.message };

    const now = new Date().toISOString();
    const { data: saved, error: saveError } = await admin
      .from("homework_collection_media")
      .upsert({
        homework_id: homeworkId,
        student_id: user.id,
        part_id: partId,
        slot_id: slotId,
        storage_path: storagePath,
        content_type: contentType,
        byte_size: file.size,
        updated_at: now,
      }, { onConflict: "homework_id,student_id,part_id,slot_id" })
      .select("id")
      .single();
    if (saveError || !saved) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return { ok: false, error: saveError?.message ?? "Could not save the picture." };
    }
    if (previous?.storage_path && previous.storage_path !== storagePath) {
      await admin.storage.from(BUCKET).remove([String(previous.storage_path)]);
    }

    const mediaId = String(saved.id);
    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/secondary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-collection-results/${homeworkId}`);
    return {
      ok: true,
      mediaId,
      url: `/api/homework-collection-media/${encodeURIComponent(mediaId)}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the picture.",
    };
  }
}
