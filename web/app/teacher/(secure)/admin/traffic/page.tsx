import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import {
  listRecentResourceDownloads,
  listRecentTrafficArrivals,
  type TrafficSourceCount,
} from "@/lib/data/admin-traffic";
import { miniSeriesDownloadLabel } from "@/lib/lesson-plans/mini-series-manifest";
import { formatTrafficSource } from "@/lib/traffic/attribution";

export const metadata = {
  title: "Traffic sources — Admin",
  robots: { index: false, follow: false },
};

function formatWhen(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

const DOWNLOAD_STATUS: Record<string, string> = {
  success: "Sent",
  unauthorized: "Link expired",
  not_found: "Not found",
  error: "Failed",
};

export default async function TeacherAdminTrafficPage() {
  const [listed, downloads] = await Promise.all([
    listRecentTrafficArrivals(),
    listRecentResourceDownloads(),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Traffic sources</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          First visit in the last 30 days, plus each lesson-plan file request. The referring site
          is the host only, so a Google visit shows as google.com. Direct means they typed the
          address, used a bookmark, or the previous site hid the source.
        </p>
      </div>

      <AdminSubnav active="traffic" />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Arrivals</h2>
        {!listed.ok ? (
          <p className="text-sm text-red-600" role="alert">
            {listed.error}
          </p>
        ) : listed.total === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
            No new arrivals in the last 30 days.
          </p>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600">
              {listed.total} arrival{listed.total === 1 ? "" : "s"}
              {listed.capped ? " (showing the latest 1,000)" : ""}.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <SourceTable title="Referring site" rows={listed.byReferrer} />
              <SourceTable title="First page" rows={listed.byLanding} />
            </div>
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {listed.recent.map((row, index) => (
                <li key={`${row.createdAt}-${index}`} className="px-4 py-3">
                  <p className="text-sm text-neutral-900">
                    {formatTrafficSource({
                      referrerHost: row.referrerHost,
                      landingPath: row.landingPath,
                      utmSource: row.utmSource,
                      utmMedium: row.utmMedium,
                      utmCampaign: row.utmCampaign,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{formatWhen(row.createdAt)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Lesson-plan downloads</h2>
        <p className="text-sm text-neutral-600">
          Sent means the file was built and returned. Email unlocks that never clicked a file do
          not appear here.
        </p>
        {!downloads.ok ? (
          <p className="text-sm text-red-600" role="alert">
            {downloads.error}
          </p>
        ) : downloads.total === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
            No lesson-plan downloads in the last 30 days.
          </p>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600">
              {downloads.total} download{downloads.total === 1 ? "" : "s"}
              {downloads.capped ? " (showing the latest 1,000)" : ""}.
            </p>
            <SourceTable title="File and result" rows={downloads.byResource} />
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {downloads.recent.map((row, index) => {
                const source = formatTrafficSource({
                  referrerHost: row.referrerHost,
                  landingPath: row.landingPath,
                  utmSource: row.utmSource,
                  utmMedium: row.utmMedium,
                  utmCampaign: row.utmCampaign,
                });
                const size = formatBytes(row.byteSize);
                return (
                  <li key={`${row.createdAt}-${index}`} className="px-4 py-3">
                    <p className="text-sm font-semibold text-neutral-900">
                      {miniSeriesDownloadLabel(row.resourceId)} · {DOWNLOAD_STATUS[row.status] ?? row.status}
                      {size ? ` · ${size}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">{row.email ?? "No email"}</p>
                    {source ? <p className="mt-1 text-xs text-neutral-500">{source}</p> : null}
                    <p className="mt-1 text-xs text-neutral-500">{formatWhen(row.createdAt)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

function SourceTable({ title, rows }: { title: string; rows: TrafficSourceCount[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-3 font-semibold">Source</th>
            <th className="py-2 text-right font-semibold">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-neutral-100">
              <td className="py-2 pr-3 text-neutral-800">{row.label}</td>
              <td className="py-2 text-right font-semibold text-neutral-900">{row.arrivals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
