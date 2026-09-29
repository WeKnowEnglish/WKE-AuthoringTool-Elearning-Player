export type ControlPlaneConfig = {
  hostingerApiToken?: string;
  hostingerUsername?: string;
  installationUuid?: string;
  githubToken?: string;
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
