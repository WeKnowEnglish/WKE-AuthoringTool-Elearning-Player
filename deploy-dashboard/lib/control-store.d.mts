export type DashboardRole = "owner" | "administrator" | "developer" | "viewer";
export type DashboardPrincipal = {
  id: string | null;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  role: DashboardRole;
  authMethod: "github" | "legacy";
  expiresAt?: string;
};

export function hashSecurityContext(value?: string | null): string | null;
export function readControlStoreConfig(environment?: NodeJS.ProcessEnv): {
  configured: boolean;
  missing: string[];
  config: { url?: string; serviceRoleKey?: string };
};
export function createControlStore(options: {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): {
  upsertGitHubUser(profile: { id: number; login: string; name?: string | null; avatar_url?: string | null }, role: DashboardRole): Promise<Record<string, unknown> | null>;
  createSession(userId: string, context?: { ip?: string; userAgent?: string }): Promise<{ token: string; expiresAt: string; maxAge: number }>;
  getSession(token?: string, context?: { userAgent?: string }): Promise<DashboardPrincipal | null>;
  revokeSession(token?: string): Promise<void>;
  appendAuditEvent(event: Record<string, unknown>): Promise<void>;
  upsertCredential(record: {
    organizationId: string;
    projectId: string;
    kind: string;
    label: string;
    ciphertext: string;
    keyVersion: number;
    expiresAt?: string | null;
  }): Promise<Record<string, unknown> | null>;
  getCredential(record: {
    organizationId: string;
    projectId: string;
    kind: string;
    label: string;
  }): Promise<Record<string, unknown> | null>;
  ensureMembership(record: { organizationId: string; userId: string; role: DashboardRole }): Promise<Record<string, unknown> | null>;
  getMembership(record: { organizationId: string; userId: string }): Promise<Record<string, unknown> | null>;
  listEligibleAdministrators(organizationId: string): Promise<Array<{ user_id: string; role: DashboardRole }>>;
  getProject(record: { organizationId: string; projectId: string }): Promise<Record<string, unknown> | null>;
  createDeploymentJob(record: {
    organizationId: string;
    projectId: string;
    requestedBy: string;
    environment: "preview" | "production";
    previewSlotKey?: string | null;
    action: "build" | "promote" | "rollback" | "destroy";
    status?: "queued" | "authorized";
    sourceBranch?: string | null;
    commitSha: string;
    idempotencyKey: string;
    approvalsRequired?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ job: Record<string, any>; created: boolean }>;
  getDeploymentJob(jobId: string): Promise<Record<string, any> | null>;
  listPendingDeploymentJobs(record: { organizationId: string; projectId: string }): Promise<Array<Record<string, any>>>;
  listActiveDeploymentJobs(record: { organizationId: string; projectId: string }): Promise<Array<Record<string, any>>>;
  transitionDeploymentJob(jobId: string, fromStatus: string, toStatus: string, patch?: Record<string, unknown>): Promise<Record<string, any> | null>;
  recordApproval(record: { jobId: string; userId: string; decision?: "approved" | "rejected"; reason?: string }): Promise<{ approval: Record<string, unknown> | null; created: boolean }>;
};
export function getConfiguredControlStore(environment?: NodeJS.ProcessEnv): ReturnType<typeof createControlStore> | null;
