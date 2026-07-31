import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { MINI_SERIES_LIBRARY_ID } from "@/lib/lesson-plans/mini-series-manifest";

export type RecordResourceDownloadLeadInput = {
  email: string;
  sourcePage: string;
  bundleId?: string;
  userAgent?: string | null;
};

export async function recordResourceDownloadLead(
  input: RecordResourceDownloadLeadInput,
): Promise<{ stored: boolean }> {
  const email = input.email.trim().toLowerCase();
  const client = createServiceRoleSupabase();
  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.info("[resource-download-lead]", email, input.sourcePage);
    }
    return { stored: false };
  }

  const { error } = await client.from("resource_download_leads").insert({
    email,
    bundle_id: input.bundleId ?? MINI_SERIES_LIBRARY_ID,
    source_page: input.sourcePage,
    user_agent: input.userAgent?.slice(0, 512) ?? null,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[resource-download-lead] insert failed", error.message);
    }
    return { stored: false };
  }

  return { stored: true };
}
