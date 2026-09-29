import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin } from "../../../../../../lib/auth.mjs";
import { auditEvent, getAuthorizedProjectContext } from "../../../../../../lib/control-plane";
import { getCurrentPrincipal, roleAllows } from "../../../../../../lib/dashboard-auth";
import { dispatchProductionDeployment } from "../../../../../../lib/deployment-dispatch";
import { canApproveDeployment } from "../../../../../../lib/deployment-policy.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectWith(origin: string, key: "notice" | "error", message: string) {
  const url = new URL("/deployments", origin);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const principal = await getCurrentPrincipal();
  if (!principal) return new Response("Unauthorized", { status: 401 });
  if (!roleAllows(principal.role, "administrator")) return new Response("Forbidden", { status: 403 });
  let origin: string;
  try {
    assertSameOrigin(request);
    origin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { jobId } = await params;
    if (!UUID_PATTERN.test(jobId)) throw new Error("Deployment job ID is invalid.");
    const context = await getAuthorizedProjectContext(principal, "administrator");
    const job = await context.store.getDeploymentJob(jobId);
    if (
      !job ||
      job.organization_id !== context.organizationId ||
      job.project_id !== context.projectId ||
      job.environment !== "production"
    ) {
      throw new Error("The production deployment request was not found in this project.");
    }
    if (job.approvals_required !== 1) {
      throw new Error("This deployment does not have a valid two-person approval requirement.");
    }
    const approval = canApproveDeployment({
      requesterId: job.requested_by,
      approverId: principal.id,
      approverRole: context.membershipRole,
      status: job.status,
    });
    if (!approval.allowed) throw new Error(approval.reason || "Approval is not permitted.");

    await context.store.recordApproval({
      jobId,
      userId: principal.id!,
      decision: "approved",
      reason: "Approved from the deployment dashboard",
    });
    await auditEvent(
      "production.job_approved",
      { jobId, action: job.action, commit: job.commit_sha, requesterId: job.requested_by },
      { principal, outcome: "authorized", request, required: true },
    );
    const authorized = await context.store.transitionDeploymentJob(jobId, "queued", "authorized");
    if (!authorized) {
      return redirectWith(origin, "notice", "Another administrator or worker already handled this request.");
    }
    const dispatched = await dispatchProductionDeployment(authorized, context.store);
    if (!dispatched.claimed || !dispatched.build) {
      return redirectWith(origin, "notice", "The approved deployment was already claimed by another worker.");
    }
    await auditEvent(
      `production.${job.action}_requested`,
      { jobId, commit: job.commit_sha, releaseBranch: dispatched.immutableBranch, productionBuildUuid: dispatched.build.uuid },
      { principal, outcome: "succeeded", request, required: true },
    );
    return redirectWith(origin, "notice", `Approved and queued production build ${dispatched.build.uuid.slice(0, 12)}.`);
  } catch (error) {
    await auditEvent(
      "production.approval_failed",
      { message: error instanceof Error ? error.message : "Unknown error" },
      { principal, outcome: "failed", request },
    );
    return redirectWith(origin, "error", error instanceof Error ? error.message : String(error));
  }
}
