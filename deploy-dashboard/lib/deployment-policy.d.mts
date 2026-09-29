export function normalizeRequestId(value: unknown): string;
export function deploymentIdempotencyKey(input: { projectId: string; requestId: string }): string;
export function productionApprovalPolicy(input: {
  eligibleAdministratorIds: string[];
  requesterId: string | null;
  singleAdministratorBreakGlass?: boolean;
}): { allowed: boolean; approvalsRequired: number; mode: string; reason: string | null };
export function canApproveDeployment(input: {
  requesterId: string | null;
  approverId: string | null;
  approverRole: string;
  status: string;
}): { allowed: boolean; reason: string | null };
