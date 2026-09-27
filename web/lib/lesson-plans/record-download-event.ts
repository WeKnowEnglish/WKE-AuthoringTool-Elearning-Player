import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { attributionDbFields, type TrafficAttribution } from "@/lib/traffic/attribution";

export type ResourceDownloadStatus = "success" | "unauthorized" | "not_found" | "error";

export type ResourceDownloadEventInput = {
  email: string | null;
  resourceId: string;
  filename: string | null;
  byteSize: number | null;
  status: ResourceDownloadStatus;
  userAgent: string | null;
  attribution: TrafficAttribution | null;
};

/** Best-effort. A tracking failure must not block the file response. */
export async function recordResourceDownloadEvent(input: ResourceDownloadEventInput): Promise<void> {
  try {
    const admin = createServiceRoleSupabase();
    if (!admin) return;

    const resourceId = input.resourceId.trim().slice(0, 120) || "unknown";
    const { error } = await admin.from("resource_download_events").insert({
      email: input.email?.trim().toLowerCase().slice(0, 320) || null,
      resource_id: resourceId,
      filename: input.filename?.slice(0, 180) ?? null,
      byte_size: input.byteSize,
      status: input.status,
      user_agent: input.userAgent?.slice(0, 512) ?? null,
      ...attributionDbFields(input.attribution),
    });
    if (error && !/resource_download_events|schema cache/i.test(error.message)) {
      console.error("resource_download_events insert failed", error.message);
    }
  } catch (error) {
    console.error("resource_download_events insert failed", error);
  }
}
