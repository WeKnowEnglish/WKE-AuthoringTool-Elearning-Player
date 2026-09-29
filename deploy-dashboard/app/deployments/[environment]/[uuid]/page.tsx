import { notFound } from "next/navigation";
import { connection } from "next/server";

import { requireAdmin } from "../../../../lib/dashboard-auth";
import { getControlPlane } from "../../../../lib/control-plane";

export const dynamic = "force-dynamic";

export default async function DeploymentDetailPage({
  params,
}: {
  params: Promise<{ environment: string; uuid: string }>;
}) {
  await connection();
  const { environment, uuid } = await params;
  if (!['preview', 'production'].includes(environment)) notFound();
  await requireAdmin(`/deployments/${environment}/${uuid}`);

  const { config, hostinger } = getControlPlane();
  const domain = environment === "preview" ? config.previewDomain : config.productionDomain;
  const [build, logResult] = await Promise.all([
    hostinger.getBuild(domain, uuid),
    hostinger.getBuildLogs(domain, uuid, 0),
  ]);
  const commit = build.options?.source_options?.commit;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/deployments"><span className="brand-mark" aria-hidden="true">W</span><span><strong>WKE Deploy</strong><small>Deployment details</small></span></a>
        <a className="refresh-button" href={`/deployments/${environment}/${uuid}`}>Refresh</a>
      </header>
      <section className="page-heading compact-heading">
        <div><p className="eyebrow">{environment} deployment</p><h1>{commit?.hash?.slice(0, 12) || uuid.slice(0, 12)}</h1><p className="hero-copy">{commit?.message || "Hostinger build record"}</p></div>
        <span className={`status-badge status-${build.state}`}>{build.state}</span>
      </section>
      <section className="detail-grid">
        <article className="deployment-card">
          <h2>Build information</h2>
          <dl className="details">
            <div><dt>Commit</dt><dd><code>{commit?.hash || "Unavailable"}</code></dd></div>
            <div><dt>Branch</dt><dd>{build.options?.source_options?.branch || "Unavailable"}</dd></div>
            <div><dt>Author</dt><dd>{commit?.author?.name || "Unavailable"}</dd></div>
            <div><dt>Build ID</dt><dd><code>{build.uuid}</code></dd></div>
            <div><dt>Created</dt><dd>{new Date(build.created_at).toLocaleString()}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(build.updated_at).toLocaleString()}</dd></div>
          </dl>
        </article>
        <article className="log-card">
          <div className="card-heading"><div><p className="eyebrow">Build output</p><h2>Logs</h2></div><span>{logResult?.lines || 0} lines</span></div>
          <pre>{logResult?.logs || "No build output is available yet."}</pre>
        </article>
      </section>
      <p className="detail-back"><a href="/deployments">← Back to deployments</a></p>
    </main>
  );
}
