import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "../../lib/dashboard-auth";
import { readAdminConfig } from "../../lib/control-config.mjs";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/deployments";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  if (await isAdminAuthenticated()) redirect(safeNext(query.next));
  const readiness = readAdminConfig();

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

        {!readiness.configured ? (
          <div className="notice notice-warning">
            Administrator access is not configured. Add {readiness.missing.join(" and ")} to the
            dashboard application environment.
          </div>
        ) : (
          <form className="auth-form" action="/api/auth/login" method="post">
            <input type="hidden" name="next" value={safeNext(query.next)} />
            <label>
              Administrator password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {query.error ? <p className="form-error">The password was not accepted.</p> : null}
            <button type="submit">Sign in securely</button>
          </form>
        )}
        <a className="back-link" href="/">← Return to public status</a>
      </section>
    </main>
  );
}
