import { connection } from "next/server";

import { probeDeployment, type DeploymentStatus } from "../lib/deployment-status.mjs";

export const dynamic = "force-dynamic";

const stateLabels: Record<DeploymentStatus["state"], string> = {
  healthy: "Ready",
  warning: "Needs attention",
  routing: "Domain not connected",
  unavailable: "Unavailable",
  misconfigured: "Not configured",
};

function shortCommit(commit: string) {
  return /^[0-9a-f]{7,64}$/i.test(commit) ? commit.slice(0, 12) : commit;
}

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function DeploymentCard({ deployment }: { deployment: DeploymentStatus }) {
  return (
    <article className="deployment-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">{deployment.name} environment</p>
          <h2>{deployment.name}</h2>
        </div>
        <span className={`status-badge status-${deployment.state}`}>
          <span aria-hidden="true" className="status-dot" />
          {stateLabels[deployment.state]}
        </span>
      </div>

      <p className="status-message">{deployment.message}</p>

      <dl className="details">
        <div>
          <dt>Release</dt>
          <dd><code>{shortCommit(deployment.commit)}</code></dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{deployment.version}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{deployment.environment}</dd>
        </div>
        <div>
          <dt>HTTP</dt>
          <dd>{deployment.httpStatus ?? "No response"}</dd>
        </div>
      </dl>

      <div className="card-footer">
        <a href={deployment.origin} rel="noreferrer" target="_blank">
          Open {deployment.name.toLowerCase()}
          <span aria-hidden="true"> ↗</span>
        </a>
        <span>Checked {formatCheckedAt(deployment.checkedAt)}</span>
      </div>
    </article>
  );
}

export default async function DashboardPage() {
  await connection();

  const productionOrigin = process.env.WKE_PRODUCTION_ORIGIN?.trim() || "https://weknowenglish.online";
  const previewOrigin = process.env.WKE_PREVIEW_ORIGIN?.trim() || "https://preview.weknowenglish.online";
  const [production, preview] = await Promise.all([
    probeDeployment({ name: "Production", origin: productionOrigin }),
    probeDeployment({ name: "Preview", origin: previewOrigin }),
  ]);
  const promotionSafe = production.releaseReady && preview.releaseReady;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="WKE Deploy home">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span>
            <strong>WKE Deploy</strong>
            <small>Release control center</small>
          </span>
        </a>
        <a className="refresh-button" href="/">Refresh status</a>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">We Know English infrastructure</p>
          <h1>Know what is live before students arrive.</h1>
          <p className="hero-copy">
            A clear view of the current production and preview releases. The dashboard checks each
            application directly and never changes production on its own.
          </p>
        </div>
        <div className={`gate-card ${promotionSafe ? "gate-ready" : "gate-hold"}`}>
          <span className="gate-icon" aria-hidden="true">{promotionSafe ? "✓" : "!"}</span>
          <div>
            <p>Promotion gate</p>
            <strong>{promotionSafe ? "Both environments are ready" : "Keep production unchanged"}</strong>
            <span>
              {promotionSafe
                ? "The preview and production health checks identify valid releases."
                : "Preview must report a healthy, identifiable release before promotion."}
            </span>
          </div>
        </div>
      </section>

      <section className="deployment-grid" aria-label="Deployment status">
        <DeploymentCard deployment={production} />
        <DeploymentCard deployment={preview} />
      </section>

      <section className="release-path">
        <div>
          <p className="eyebrow">Safe release path</p>
          <h2>Preview first. Production only after verification.</h2>
        </div>
        <ol>
          <li><span>1</span><div><strong>Build preview</strong><p>Hostinger deploys the selected branch away from students and teachers.</p></div></li>
          <li><span>2</span><div><strong>Verify release</strong><p>The health endpoint must report the exact commit and a production runtime.</p></div></li>
          <li><span>3</span><div><strong>Promote intentionally</strong><p>Only the tested commit moves forward; the last successful release stays live.</p></div></li>
        </ol>
      </section>

      <footer>
        <span>Read-only milestone · No deployment credentials are exposed</span>
        <a href="/api/health">Dashboard health</a>
      </footer>
    </main>
  );
}
