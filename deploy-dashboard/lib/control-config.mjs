const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DASHBOARD_ROLES = new Set(["owner", "administrator", "developer", "viewer"]);
// Preserve saved hosting configurations while retiring the temporary release branches.
const RETIRED_PREVIEW_BRANCHES = new Set([
  "codex/infra-002-managed-release",
  "codex/vercel-retirement",
  "codex/fix-deploy-form-origin",
]);

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
  const configuredPreviewBranch = value(environment, "WKE_DASHBOARD_PREVIEW_BRANCH") || "main";
  const githubToken = value(environment, "GITHUB_DEPLOY_TOKEN");
  const githubAppId = validate(
    "WKE_GITHUB_APP_ID",
    value(environment, "WKE_GITHUB_APP_ID"),
    /^\d+$/,
  );
  const githubAppPrivateKey = value(environment, "WKE_GITHUB_APP_PRIVATE_KEY");
  const githubAppInstallationId = validate(
    "WKE_GITHUB_APP_INSTALLATION_ID",
    value(environment, "WKE_GITHUB_APP_INSTALLATION_ID"),
    /^\d+$/,
  );
  const anyGitHubAppValue = Boolean(githubAppId || githubAppPrivateKey || githubAppInstallationId);
  const githubAppConfigured = Boolean(githubAppId && githubAppPrivateKey && githubAppInstallationId);
  if (!githubToken && !githubAppConfigured) {
    if (anyGitHubAppValue) {
      if (!githubAppId) missing.push("WKE_GITHUB_APP_ID");
      if (!githubAppPrivateKey) missing.push("WKE_GITHUB_APP_PRIVATE_KEY");
      if (!githubAppInstallationId) missing.push("WKE_GITHUB_APP_INSTALLATION_ID");
    } else {
      missing.push("GitHub App credentials or GITHUB_DEPLOY_TOKEN");
    }
  }
  const config = {
    hostingerApiToken: required(environment, "HOSTINGER_API_TOKEN", missing),
    hostingerUsername: required(environment, "WKE_HOSTINGER_USERNAME", missing),
    installationUuid: validate(
      "WKE_HOSTINGER_GIT_INSTALLATION_UUID",
      required(environment, "WKE_HOSTINGER_GIT_INSTALLATION_UUID", missing),
      UUID_PATTERN,
    ),
    githubToken,
    githubAppId,
    githubAppPrivateKey,
    githubAppInstallationId,
    githubAuthentication: githubAppConfigured ? "app" : githubToken ? "token" : undefined,
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
    previewBranch: RETIRED_PREVIEW_BRANCHES.has(configuredPreviewBranch) ? "main" : configuredPreviewBranch,
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

function parseRoleMap(raw) {
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("WKE_DASHBOARD_GITHUB_ROLE_MAP must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("WKE_DASHBOARD_GITHUB_ROLE_MAP must be a JSON object.");
  }
  const result = {};
  for (const [login, role] of Object.entries(parsed)) {
    if (!/^[A-Za-z0-9-]{1,39}$/.test(login) || !DASHBOARD_ROLES.has(role)) {
      throw new Error("WKE_DASHBOARD_GITHUB_ROLE_MAP contains an invalid login or role.");
    }
    result[login.toLowerCase()] = role;
  }
  return result;
}

export function readIdentityConfig(environment = process.env) {
  const githubClientId = value(environment, "WKE_DASHBOARD_GITHUB_CLIENT_ID");
  const githubClientSecret = value(environment, "WKE_DASHBOARD_GITHUB_CLIENT_SECRET");
  const databaseUrl = value(environment, "CONTROL_PLANE_SUPABASE_URL");
  const databaseServiceRoleKey = value(environment, "CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY");
  const roleMap = parseRoleMap(value(environment, "WKE_DASHBOARD_GITHUB_ROLE_MAP"));
  const oauthMissing = [];
  if (!githubClientId) oauthMissing.push("WKE_DASHBOARD_GITHUB_CLIENT_ID");
  if (!githubClientSecret) oauthMissing.push("WKE_DASHBOARD_GITHUB_CLIENT_SECRET");
  if (!databaseUrl) oauthMissing.push("CONTROL_PLANE_SUPABASE_URL");
  if (!databaseServiceRoleKey) oauthMissing.push("CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY");
  if (!Object.keys(roleMap).length) oauthMissing.push("WKE_DASHBOARD_GITHUB_ROLE_MAP");

  const legacy = readAdminConfig(environment);
  const oauthConfigured = oauthMissing.length === 0;
  const breakGlassEnabled = value(environment, "WKE_DASHBOARD_BREAK_GLASS_ENABLED") === "true";
  const legacyEnabled = legacy.configured && (!oauthConfigured || breakGlassEnabled);

  return {
    configured: oauthConfigured || legacyEnabled,
    mode: oauthConfigured ? "github" : legacyEnabled ? "legacy" : "unconfigured",
    oauthConfigured,
    oauthMissing,
    legacyEnabled,
    breakGlassEnabled,
    config: {
      githubClientId,
      githubClientSecret,
      databaseUrl,
      databaseServiceRoleKey,
      roleMap,
      requireGitHub2FA: value(environment, "WKE_DASHBOARD_REQUIRE_GITHUB_2FA") !== "false",
    },
  };
}

export function readDeploymentContextConfig(environment = process.env) {
  const missing = [];
  const organizationId = validate(
    "CONTROL_PLANE_ORGANIZATION_ID",
    required(environment, "CONTROL_PLANE_ORGANIZATION_ID", missing),
    UUID_PATTERN,
  );
  const projectId = validate(
    "CONTROL_PLANE_PROJECT_ID",
    required(environment, "CONTROL_PLANE_PROJECT_ID", missing),
    UUID_PATTERN,
  );

  return {
    configured: missing.length === 0,
    missing,
    config: {
      organizationId,
      projectId,
      singleAdministratorBreakGlass:
        value(environment, "WKE_DEPLOY_SINGLE_ADMIN_BREAK_GLASS") === "true",
    },
  };
}
