import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "../../lib/dashboard-auth";
import { readIdentityConfig } from "../../lib/control-config.mjs";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/deployments";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  if (await isAdminAuthenticated()) redirect(safeNext(query.next));
  const identity = readIdentityConfig();
  const errorMessage =
    query.error === "not_authorized"
      ? "This GitHub account is not authorized to administer deployments."
      : query.error
        ? "Sign-in could not be completed. Please try again."
        : null;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="brand" href="/" aria-label="WKE Deploy home">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span><strong>WKE Deploy</strong><small>Administrator access</small></span>
        </a>
        <div>
          <p className="eyebrow">Private control plane</p>
          <h1>Sign in to manage releases.</h1>
          <p className="hero-copy">Deployment controls are isolated from the public status page.</p>
        </div>

        {!identity.configured ? (
          <div className="notice notice-warning">
            Administrator access is not configured. Configure GitHub identity or the temporary
            legacy administrator credentials in the dashboard environment.
          </div>
        ) : null}

        {identity.oauthConfigured ? (
          <div className="auth-form">
            <a className="oauth-button" href={`/api/auth/github?next=${encodeURIComponent(safeNext(query.next))}`}>
              Continue securely with GitHub
            </a>
            <p className="security-note">Only explicitly allowlisted GitHub accounts are accepted.</p>
          </div>
        ) : null}

        {identity.legacyEnabled ? (
          <form className="auth-form" action="/api/auth/login" method="post">
            <input type="hidden" name="next" value={safeNext(query.next)} />
            <label>
              {identity.oauthConfigured ? "Emergency administrator password" : "Administrator password"}
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button type="submit">{identity.oauthConfigured ? "Use break-glass access" : "Sign in securely"}</button>
          </form>
        ) : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {identity.mode === "legacy" ? (
          <div className="notice notice-warning">
            Temporary legacy authentication is active. Configure GitHub OAuth and the control-plane
            database before onboarding additional operators or clients.
          </div>
        ) : null}
        <a className="back-link" href="/">← Return to public status</a>
      </section>
    </main>
  );
}
