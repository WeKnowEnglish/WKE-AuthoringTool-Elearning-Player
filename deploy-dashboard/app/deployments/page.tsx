import { randomUUID } from "node:crypto";
import { connection } from "next/server";

import { ConfirmSubmitButton } from "../components/confirm-submit-button";
import { requireAdmin, roleAllows } from "../../lib/dashboard-auth";
import { readControlPlaneConfig } from "../../lib/control-config.mjs";
import { getAuthorizedProjectContext, getControlPlane } from "../../lib/control-plane";
import { probeDeployment } from "../../lib/deployment-status.mjs";

export const dynamic = "force-dynamic";

type Build = {
  uuid: string;
  state: "pending" | "running" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  options?: {
    source_options?: {
      branch?: string;
      commit?: { hash?: string; message?: string; author?: { name?: string } } | null;
    };
  };
};

type DeploymentRow = Build & { environment: "preview" | "production" };
type PendingJob = {
  id: string;
  action: "promote" | "rollback";
  commit_sha: string;
  requested_by: string | null;
  created_at: string;
};

function shortCommit(value: string | undefined) {
  return value?.slice(0, 12) || "Unavailable";
}

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function commitsMatch(left: string | undefined, right: string | undefined) {
  if (!left || !right) return false;
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  return normalizedLeft.startsWith(normalizedRight) || normalizedRight.startsWith(normalizedLeft);
}

export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await connection();
  const principal = await requireAdmin("/deployments");
  const query = await searchParams;
  const readiness = readControlPlaneConfig();

  let rows: DeploymentRow[] = [];
  let loadError: string | null = null;
  let previewCommit: string | undefined;
  let productionCommit: string | undefined;
  let pendingJobs: PendingJob[] = [];

  if (readiness.configured) {
    try {
      const { config, hostinger } = getControlPlane();
      const [previewBuilds, productionBuilds, previewHealth, productionHealth] = await Promise.all([
        hostinger.listBuilds(config.previewDomain, { perPage: 20 }),
        hostinger.listBuilds(config.productionDomain, { perPage: 20 }),
        probeDeployment({ name: "Preview", origin: `https://${config.previewDomain}` }),
        probeDeployment({ name: "Production", origin: `https://${config.productionDomain}` }),
      ]);
      previewCommit = previewHealth.commit;
      productionCommit = productionHealth.commit;
      rows = [
        ...(previewBuilds?.data || []).map((build: Build) => ({ ...build, environment: "preview" as const })),
        ...(productionBuilds?.data || []).map((build: Build) => ({ ...build, environment: "production" as const })),
      ].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
      if (principal.authMethod === "github") {
        const context = await getAuthorizedProjectContext(principal, "viewer");
        pendingJobs = await context.store.listPendingDeploymentJobs({
          organizationId: context.organizationId,
          projectId: context.projectId,
        }) as PendingJob[];
      }
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span><strong>WKE Deploy</strong><small>Release control center</small></span>
        </a>
        <nav className="topbar-actions">
          <span className="identity-chip">{principal.displayName} · {principal.role}</span>
          <a className="refresh-button" href="/deployments">Refresh</a>
          <form action="/api/auth/logout" method="post"><button className="link-button" type="submit">Sign out</button></form>
        </nav>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">Managed Hostinger releases</p>
          <h1>Deployments</h1>
          <p className="hero-copy">Build previews, inspect logs, promote the verified commit, and return to a prior production release.</p>
        </div>
        {readiness.configured && roleAllows(principal.role, "developer") ? (
          <form className="deploy-form" action="/api/control/preview" method="post">
            <input type="hidden" name="requestId" value={randomUUID()} />
            <label>
              Branch to preview
              <input name="branch" defaultValue={readiness.config.previewBranch} required />
            </label>
            <ConfirmSubmitButton confirmation="Start a new preview build from this branch?">
              Build preview
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </section>

      {query.notice ? <div className="notice notice-success">{query.notice}</div> : null}
      {query.error ? <div className="notice notice-error">{query.error}</div> : null}
      {!readiness.configured ? (
        <div className="notice notice-warning">
          Controls are locked until these server variables are configured: {readiness.missing.join(", ")}.
        </div>
      ) : null}
      {loadError ? <div className="notice notice-error">{loadError}</div> : null}

      <section className="release-summary" aria-label="Current releases">
        <div><span>Production commit</span><strong><code>{shortCommit(productionCommit)}</code></strong></div>
        <div><span>Preview commit</span><strong><code>{shortCommit(previewCommit)}</code></strong></div>
        <div><span>Builds shown</span><strong>{rows.length}</strong></div>
      </section>

      {pendingJobs.length ? (
        <section className="table-card approval-card" aria-label="Production approvals">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Protected production changes</p>
              <h2>Awaiting approval</h2>
            </div>
            <span className="status-badge status-pending">{pendingJobs.length} pending</span>
          </div>
          <div className="table-scroll">
            <table className="deployment-table">
              <thead><tr><th>Action</th><th>Commit</th><th>Requested</th><th>Control</th></tr></thead>
              <tbody>{pendingJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.action}</td>
                  <td><code>{shortCommit(job.commit_sha)}</code></td>
                  <td title={job.created_at}>{relativeTime(job.created_at)}</td>
                  <td>
                    {roleAllows(principal.role, "administrator") && principal.id !== job.requested_by ? (
                      <form action={`/api/control/jobs/${job.id}/approve`} method="post">
                        <ConfirmSubmitButton
                          confirmation={`Approve production ${job.action} of ${shortCommit(job.commit_sha)}?`}
                          className="table-action-button"
                        >
                          Approve and deploy
                        </ConfirmSubmitButton>
                      </form>
                    ) : <small>{principal.id === job.requested_by ? "A different administrator must approve." : "Administrator approval required."}</small>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="table-card">
        <div className="table-scroll">
          <table className="deployment-table">
            <thead><tr><th>Status</th><th>Environment</th><th>Commit</th><th>Branch</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((build) => {
                const commit = build.options?.source_options?.commit?.hash;
                const current = commitsMatch(
                  commit,
                  build.environment === "preview" ? previewCommit : productionCommit,
                );
                return (
                  <tr key={`${build.environment}-${build.uuid}`}>
                    <td><span className={`status-badge status-${build.state}`}>{build.state}</span></td>
                    <td><span className={`environment-pill environment-${build.environment}`}>{build.environment}</span></td>
                    <td><code>{shortCommit(commit)}</code>{current ? <small className="current-label">Current</small> : null}</td>
                    <td>{build.options?.source_options?.branch || "—"}</td>
                    <td title={build.created_at}>{relativeTime(build.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <a href={`/deployments/${build.environment}/${build.uuid}`}>Details</a>
                        {roleAllows(principal.role, "administrator") && build.environment === "preview" && build.state === "completed" && current && commit ? (
                          <form action="/api/control/release" method="post">
                            <input type="hidden" name="requestId" value={randomUUID()} />
                            <input type="hidden" name="action" value="promote" />
                            <input type="hidden" name="commit" value={commit} />
                            <input type="hidden" name="buildUuid" value={build.uuid} />
                            <ConfirmSubmitButton confirmation={`Promote preview ${shortCommit(commit)} to production?`} className="table-action-button">
                              Promote
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                        {roleAllows(principal.role, "administrator") && build.environment === "production" && build.state === "completed" && !current && commit ? (
                          <form action="/api/control/release" method="post">
                            <input type="hidden" name="requestId" value={randomUUID()} />
                            <input type="hidden" name="action" value="rollback" />
                            <input type="hidden" name="commit" value={commit} />
                            <input type="hidden" name="buildUuid" value={build.uuid} />
                            <ConfirmSubmitButton confirmation={`Rollback production to ${shortCommit(commit)}?`} className="table-action-button warning-button">
                              Roll back
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={6} className="empty-cell">No deployment history is available.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
