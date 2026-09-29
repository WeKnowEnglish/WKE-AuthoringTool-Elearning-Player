const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(environment, key) {
  const normalized = environment[key]?.trim();
  return normalized || undefined;
}

function required(environment, key, missing) {
  const resolved = value(environment, key);
  if (!resolved) missing.push(key);
  return resolved;
}

function validate(name, resolved, pattern) {
  if (resolved && !pattern.test(resolved)) {
    throw new Error(`${name} is invalid.`);
  }
  return resolved;
}

export function readControlPlaneConfig(environment = process.env) {
  const missing = [];
  const config = {
    hostingerApiToken: required(environment, "HOSTINGER_API_TOKEN", missing),
    hostingerUsername: required(environment, "WKE_HOSTINGER_USERNAME", missing),
    installationUuid: validate(
      "WKE_HOSTINGER_GIT_INSTALLATION_UUID",
      required(environment, "WKE_HOSTINGER_GIT_INSTALLATION_UUID", missing),
      UUID_PATTERN,
    ),
    githubToken: required(environment, "GITHUB_DEPLOY_TOKEN", missing),
    githubOwner: validate(
      "WKE_GITHUB_OWNER",
      required(environment, "WKE_GITHUB_OWNER", missing),
      OWNER_PATTERN,
    ),
    githubRepository: validate(
      "WKE_GITHUB_REPOSITORY",
      required(environment, "WKE_GITHUB_REPOSITORY", missing),
      REPOSITORY_NAME_PATTERN,
    ),
    productionDomain: validate(
      "WKE_PRODUCTION_DOMAIN",
      value(environment, "WKE_PRODUCTION_DOMAIN") || "weknowenglish.online",
      DOMAIN_PATTERN,
    ),
    previewDomain: validate(
      "WKE_PREVIEW_DOMAIN",
      value(environment, "WKE_PREVIEW_DOMAIN") || "preview.weknowenglish.online",
      DOMAIN_PATTERN,
    ),
    previewBranch:
      value(environment, "WKE_DASHBOARD_PREVIEW_BRANCH") || "codex/infra-002-managed-release",
    productionBranch: value(environment, "WKE_DASHBOARD_PRODUCTION_BRANCH") || "main",
  };

  return {
    configured: missing.length === 0,
    missing,
    config,
  };
}

export function readAdminConfig(environment = process.env) {
  const missing = [];
  const password = required(environment, "WKE_DASHBOARD_ADMIN_PASSWORD", missing);
  const sessionSecret = required(environment, "WKE_DASHBOARD_SESSION_SECRET", missing);

  if (password && password.length < 12) {
    throw new Error("WKE_DASHBOARD_ADMIN_PASSWORD must contain at least 12 characters.");
  }
  if (sessionSecret && sessionSecret.length < 32) {
    throw new Error("WKE_DASHBOARD_SESSION_SECRET must contain at least 32 characters.");
  }

  return {
    configured: missing.length === 0,
    missing,
    config: { password, sessionSecret },
  };
}
