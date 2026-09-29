export type ControlPlaneConfig = {
  hostingerApiToken?: string;
  hostingerUsername?: string;
  installationUuid?: string;
  githubToken?: string;
  githubAppId?: string;
  githubAppPrivateKey?: string;
  githubAppInstallationId?: string;
  githubAuthentication?: "app" | "token";
  githubOwner?: string;
  githubRepository?: string;
  productionDomain?: string;
  previewDomain?: string;
  previewBranch: string;
  productionBranch: string;
};

export function readControlPlaneConfig(environment?: NodeJS.ProcessEnv): {
  configured: boolean;
  missing: string[];
  config: ControlPlaneConfig;
};

export function readAdminConfig(environment?: NodeJS.ProcessEnv): {
  configured: boolean;
  missing: string[];
  config: { password?: string; sessionSecret?: string };
};

export type DashboardRole = "owner" | "administrator" | "developer" | "viewer";
export function readIdentityConfig(environment?: NodeJS.ProcessEnv): {
  configured: boolean;
  mode: "github" | "legacy" | "unconfigured";
  oauthConfigured: boolean;
  oauthMissing: string[];
  legacyEnabled: boolean;
  breakGlassEnabled: boolean;
  config: {
    githubClientId?: string;
    githubClientSecret?: string;
    databaseUrl?: string;
    databaseServiceRoleKey?: string;
      roleMap: Record<string, DashboardRole>;
      requireGitHub2FA: boolean;
  };
};

export function readDeploymentContextConfig(environment?: NodeJS.ProcessEnv): {
  configured: boolean;
  missing: string[];
  config: {
    organizationId?: string;
    projectId?: string;
    singleAdministratorBreakGlass: boolean;
  };
};
