import { createHash } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRequestId(value) {
  const requestId = String(value || "").trim();
  if (!UUID_PATTERN.test(requestId)) throw new Error("The deployment request ID is invalid.");
  return requestId.toLowerCase();
}

export function deploymentIdempotencyKey({ projectId, requestId }) {
  const normalizedProjectId = normalizeRequestId(projectId);
  const normalizedRequestId = normalizeRequestId(requestId);
  return createHash("sha256")
    .update(`wke-deploy:v1:${normalizedProjectId}:${normalizedRequestId}`)
    .digest("hex");
}

export function productionApprovalPolicy({ eligibleAdministratorIds, requesterId, singleAdministratorBreakGlass = false }) {
  const eligible = [...new Set((eligibleAdministratorIds || []).filter(Boolean))];
  if (!requesterId || !eligible.includes(requesterId)) {
    return { allowed: false, approvalsRequired: 0, mode: "denied", reason: "Requester is not an eligible project administrator." };
  }
  if (eligible.some((id) => id !== requesterId)) {
    return { allowed: true, approvalsRequired: 1, mode: "two-person", reason: null };
  }
  if (singleAdministratorBreakGlass) {
    return { allowed: true, approvalsRequired: 0, mode: "single-admin-break-glass", reason: null };
  }
  return {
    allowed: false,
    approvalsRequired: 1,
    mode: "blocked",
    reason: "Production requires a second project administrator. Add another administrator or explicitly enable the audited single-admin break-glass policy.",
  };
}

export function canApproveDeployment({ requesterId, approverId, approverRole, status }) {
  if (status !== "queued") return { allowed: false, reason: "This deployment is no longer awaiting approval." };
  if (!approverId || requesterId === approverId) return { allowed: false, reason: "Requesters cannot approve their own production deployment." };
  if (approverRole !== "owner" && approverRole !== "administrator") {
    return { allowed: false, reason: "Only a project owner or administrator can approve production." };
  }
  return { allowed: true, reason: null };
}
