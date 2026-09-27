import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { MINI_SERIES_LIBRARY_ID } from "@/lib/lesson-plans/mini-series-manifest";
import { attributionDbFields, attributionMissingColumn, type TrafficAttribution } from "@/lib/traffic/attribution";

export type RecordResourceDownloadLeadInput = {
  email: string;
  sourcePage: string;
  bundleId?: string;
  userAgent?: string | null;
  attribution?: TrafficAttribution | null;
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

  const base = {
    email,
    bundle_id: input.bundleId ?? MINI_SERIES_LIBRARY_ID,
    source_page: input.sourcePage,
    user_agent: input.userAgent?.slice(0, 512) ?? null,
  };
  let { error } = await client.from("resource_download_leads").insert({
    ...base,
    ...attributionDbFields(input.attribution ?? null),
  });
  if (error && attributionMissingColumn(error.message)) {
    ({ error } = await client.from("resource_download_leads").insert(base));
  }

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[resource-download-lead] insert failed", error.message);
    }
    return { stored: false };
  }

  return { stored: true };
}
