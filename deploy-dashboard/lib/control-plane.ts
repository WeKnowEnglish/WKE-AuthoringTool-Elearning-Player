import { createGitHubClient } from "./github-client.mjs";
import { createHostingerClient } from "./hostinger-client.mjs";
import { readControlPlaneConfig } from "./control-config.mjs";

export function getControlPlane() {
  const readiness = readControlPlaneConfig();
  if (!readiness.configured) {
    throw new Error(`Dashboard control plane is missing: ${readiness.missing.join(", ")}.`);
  }

  const config = readiness.config;
  const required = {
    hostingerApiToken: config.hostingerApiToken!,
    hostingerUsername: config.hostingerUsername!,
    installationUuid: config.installationUuid!,
    githubToken: config.githubToken!,
    githubOwner: config.githubOwner!,
    githubRepository: config.githubRepository!,
    productionDomain: config.productionDomain!,
    previewDomain: config.previewDomain!,
  };

  return {
    config: { ...config, ...required },
    hostinger: createHostingerClient({
      token: required.hostingerApiToken,
      username: required.hostingerUsername,
    }),
    github: createGitHubClient({
      token: required.githubToken,
      owner: required.githubOwner,
      repository: required.githubRepository,
    }),
  };
}

export function auditEvent(event: string, details: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "wke-deploy-dashboard",
      actor: "administrator",
      event,
      ...details,
    }),
  );
}
