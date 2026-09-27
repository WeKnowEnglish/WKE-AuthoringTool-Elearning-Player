import "server-only";

import { requireAdminContext } from "@/lib/admin/admin-context";
import { miniSeriesDownloadLabel } from "@/lib/lesson-plans/mini-series-manifest";

export type TrafficSourceCount = {
  label: string;
  arrivals: number;
};

export type TrafficArrivalRow = {
  createdAt: string;
  landingPath: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

const WINDOW_DAYS = 30;
const ROW_LIMIT = 1000;

export type ResourceDownloadRow = {
  createdAt: string;
  email: string | null;
  resourceId: string;
  filename: string | null;
  byteSize: number | null;
  status: string;
  referrerHost: string | null;
  landingPath: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

export async function listRecentResourceDownloads(): Promise<
  | {
      ok: true;
      days: number;
      total: number;
      capped: boolean;
      byResource: TrafficSourceCount[];
      recent: ResourceDownloadRow[];
    }
  | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await gate.ctx.service
    .from("resource_download_events")
    .select(
      "email, resource_id, filename, byte_size, status, referrer_host, landing_path, utm_source, utm_medium, utm_campaign, created_at",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (error) {
    if (/resource_download_events|schema cache/i.test(error.message)) {
      return {
        ok: false,
        error: "Download tracking is not ready yet. Apply migration 152_resource_download_events.sql.",
      };
    }
    return { ok: false, error: error.message };
  }

  const rows = data ?? [];
  return {
    ok: true,
    days: WINDOW_DAYS,
    total: rows.length,
    capped: rows.length >= ROW_LIMIT,
    byResource: countBy(rows, (row) => {
      const status = String(row.status ?? "");
      const result = status === "success" ? "sent" : status === "unauthorized" ? "expired" : status.replaceAll("_", " ");
      return `${miniSeriesDownloadLabel(String(row.resource_id ?? "unknown"))} · ${result}`;
    }),
    recent: rows.slice(0, 20).map((row) => ({
      createdAt: String(row.created_at ?? ""),
      email: (row.email as string | null) ?? null,
      resourceId: String(row.resource_id ?? ""),
      filename: (row.filename as string | null) ?? null,
      byteSize: row.byte_size == null || row.byte_size === "" ? null : Number(row.byte_size),
      status: String(row.status ?? ""),
      referrerHost: (row.referrer_host as string | null) ?? null,
      landingPath: (row.landing_path as string | null) ?? null,
      utmSource: (row.utm_source as string | null) ?? null,
      utmMedium: (row.utm_medium as string | null) ?? null,
      utmCampaign: (row.utm_campaign as string | null) ?? null,
    })),
  };
}

export async function listRecentTrafficArrivals(): Promise<
  | {
      ok: true;
      days: number;
      total: number;
      capped: boolean;
      byReferrer: TrafficSourceCount[];
      byLanding: TrafficSourceCount[];
      recent: TrafficArrivalRow[];
    }
  | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await gate.ctx.service
    .from("traffic_arrivals")
    .select("landing_path, referrer_host, utm_source, utm_medium, utm_campaign, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (error) {
    if (/traffic_arrivals|schema cache/i.test(error.message)) {
      return { ok: false, error: "Traffic storage is not ready yet. Apply migration 150_traffic_attribution.sql." };
    }
    return { ok: false, error: error.message };
  }

  const rows = data ?? [];
  return {
    ok: true,
    days: WINDOW_DAYS,
    total: rows.length,
    capped: rows.length >= ROW_LIMIT,
    byReferrer: countBy(rows, (row) => (row.referrer_host as string | null) || "direct"),
    byLanding: countBy(rows, (row) => String(row.landing_path ?? "/")),
    recent: rows.slice(0, 20).map((row) => ({
      createdAt: String(row.created_at ?? ""),
      landingPath: String(row.landing_path ?? "/"),
      referrerHost: (row.referrer_host as string | null) ?? null,
      utmSource: (row.utm_source as string | null) ?? null,
      utmMedium: (row.utm_medium as string | null) ?? null,
      utmCampaign: (row.utm_campaign as string | null) ?? null,
    })),
  };
}

function countBy(
  rows: Array<Record<string, unknown>>,
  labelFor: (row: Record<string, unknown>) => string,
): TrafficSourceCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = labelFor(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, arrivals]) => ({ label, arrivals }))
    .sort((a, b) => b.arrivals - a.arrivals || a.label.localeCompare(b.label));
}
