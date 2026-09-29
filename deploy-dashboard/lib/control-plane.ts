import { createGitHubClient } from "./github-client.mjs";
import { createGitHubAppTokenProvider } from "./github-app.mjs";
import { createHostingerClient } from "./hostinger-client.mjs";
import {
  readControlPlaneConfig,
  readDeploymentContextConfig,
  type DashboardRole,
} from "./control-config.mjs";
import { getConfiguredControlStore, type DashboardPrincipal } from "./control-store.mjs";
import { roleAllows } from "./dashboard-auth";

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
    githubOwner: config.githubOwner!,
    githubRepository: config.githubRepository!,
    productionDomain: config.productionDomain!,
    previewDomain: config.previewDomain!,
  };

  const githubTokenProvider =
    config.githubAuthentication === "app" &&
    config.githubAppId &&
    config.githubAppPrivateKey &&
    config.githubAppInstallationId
      ? createGitHubAppTokenProvider({
          appId: config.githubAppId,
          privateKey: config.githubAppPrivateKey,
          installationId: config.githubAppInstallationId,
        })
      : undefined;

  return {
    config: { ...config, ...required },
    hostinger: createHostingerClient({
      token: required.hostingerApiToken,
      username: required.hostingerUsername,
    }),
    github: createGitHubClient({
      token: config.githubToken,
      tokenProvider: githubTokenProvider,
      owner: required.githubOwner,
      repository: required.githubRepository,
    }),
  };
}

export async function getAuthorizedProjectContext(
  principal: DashboardPrincipal,
  requiredRole: DashboardRole,
) {
  if (!principal.id || principal.authMethod !== "github") {
    throw new Error("Individual GitHub identity is required for persistent deployment jobs.");
  }
  const readiness = readDeploymentContextConfig();
  if (!readiness.configured || !readiness.config.organizationId || !readiness.config.projectId) {
    throw new Error(`Deployment context is missing: ${readiness.missing.join(", ")}.`);
  }
  const store = getConfiguredControlStore();
  if (!store) throw new Error("The control-plane database is not configured.");
  const [membership, project] = await Promise.all([
    store.getMembership({ organizationId: readiness.config.organizationId, userId: principal.id }),
    store.getProject({
      organizationId: readiness.config.organizationId,
      projectId: readiness.config.projectId,
    }),
  ]);
  if (!membership || !roleAllows(membership.role as DashboardRole, requiredRole)) {
    throw new Error("Your project membership does not authorize this action.");
  }
  if (!project) throw new Error("The configured deployment project is unavailable or inactive.");
  const provider = readControlPlaneConfig();
  if (
    !provider.configured ||
    String(project.github_owner).toLowerCase() !== provider.config.githubOwner?.toLowerCase() ||
    String(project.github_repository).toLowerCase() !== provider.config.githubRepository?.toLowerCase() ||
    String(project.preview_domain).toLowerCase() !== provider.config.previewDomain?.toLowerCase() ||
    String(project.production_domain).toLowerCase() !== provider.config.productionDomain?.toLowerCase()
  ) {
    throw new Error("The deployment project does not match the configured repository and domains.");
  }
  return {
    store,
    organizationId: readiness.config.organizationId,
    projectId: readiness.config.projectId,
    project,
    membershipRole: membership.role as DashboardRole,
    singleAdministratorBreakGlass: readiness.config.singleAdministratorBreakGlass,
  };
}

export async function auditEvent(
  event: string,
  details: Record<string, unknown>,
  context: {
    principal?: DashboardPrincipal | null;
    outcome?: "authorized" | "succeeded" | "failed" | "denied" | "observed";
    request?: Request;
    required?: boolean;
  } = {},
) {
  const actor = context.principal?.login || "system";
  const record = {
    timestamp: new Date().toISOString(),
    service: "wke-deploy-dashboard",
    actor,
    event,
    outcome: context.outcome || "observed",
    ...details,
  };
  console.info(JSON.stringify(record));

  const store = getConfiguredControlStore();
  if (!store) {
    if (context.required) throw new Error("Durable audit storage is required for this action.");
    return;
  }
  try {
    const deploymentContext = readDeploymentContextConfig();
    await store.appendAuditEvent({
      organizationId: deploymentContext.configured
        ? deploymentContext.config.organizationId
        : null,
      projectId: deploymentContext.configured ? deploymentContext.config.projectId : null,
      actorUserId: context.principal?.id || null,
      actorLogin: actor,
      name: event,
      outcome: context.outcome || "observed",
      ip: context.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: context.request?.headers.get("user-agent") || undefined,
      metadata: details,
    });
  } catch (error) {
    console.error("Durable audit write failed.", error);
    if (context.required) throw new Error("The security audit record could not be written; the action was stopped.");
  }
}
