import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin } from "../../../../lib/auth.mjs";
import { auditEvent, getAuthorizedProjectContext, getControlPlane } from "../../../../lib/control-plane";
import { getCurrentPrincipal, roleAllows } from "../../../../lib/dashboard-auth";
import { dispatchProductionDeployment } from "../../../../lib/deployment-dispatch";
import {
  deploymentIdempotencyKey,
  normalizeRequestId,
  productionApprovalPolicy,
} from "../../../../lib/deployment-policy.mjs";
import { normalizeCommit } from "../../../../lib/github-client.mjs";

function commitsMatch(left: string, right: string) {
  return left.startsWith(right) || right.startsWith(left);
}

function redirectWith(requestOrigin: string, key: "notice" | "error", message: string) {
  const url = new URL("/deployments", requestOrigin);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

async function requireHealthyPreview(origin: string, expectedCommit: string) {
  const response = await fetch(`${origin}/api/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Preview health check returned HTTP ${response.status}.`);
  const payload = await response.json();
  const observed = normalizeCommit(payload.commit);
  if (payload.status !== "ok" || payload.environment !== "production" || !commitsMatch(expectedCommit, observed)) {
    throw new Error("Preview is not healthy at the requested commit; production was left unchanged.");
  }
}

export async function POST(request: Request) {
  const principal = await getCurrentPrincipal();
  if (!principal) return new Response("Unauthorized", { status: 401 });
  if (!roleAllows(principal.role, "administrator")) return new Response("Forbidden", { status: 403 });
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const form = await request.formData();
    const action = String(form.get("action") || "") as "promote" | "rollback";
    const requestedCommit = normalizeCommit(form.get("commit"));
    const buildUuid = String(form.get("buildUuid") || "");
    if (!["promote", "rollback"].includes(action)) throw new Error("Release action is invalid.");

    const { config, hostinger, github } = getControlPlane();
    if (principal.authMethod === "github") {
      const context = await getAuthorizedProjectContext(principal, "administrator");
      const requestId = normalizeRequestId(form.get("requestId"));
      const commit = await github.resolveCommit(requestedCommit);
      const administrators = await context.store.listEligibleAdministrators(context.organizationId);
      const policy = productionApprovalPolicy({
        eligibleAdministratorIds: administrators.map((membership) => membership.user_id),
        requesterId: principal.id,
        singleAdministratorBreakGlass: context.singleAdministratorBreakGlass,
      });
      if (!policy.allowed) throw new Error(policy.reason || "Production deployment is not authorized.");

      const result = await context.store.createDeploymentJob({
        organizationId: context.organizationId,
        projectId: context.projectId,
        requestedBy: principal.id!,
        environment: "production",
        action,
        status: policy.approvalsRequired ? "queued" : "authorized",
        commitSha: commit,
        idempotencyKey: deploymentIdempotencyKey({ projectId: context.projectId, requestId }),
        approvalsRequired: policy.approvalsRequired,
        metadata: { requestId, sourceBuildUuid: buildUuid, approvalMode: policy.mode },
      });
      await auditEvent(
        `production.${action}_job_created`,
        { jobId: result.job.id, commit, sourceBuildUuid: buildUuid, approvalMode: policy.mode },
        { principal, outcome: "authorized", request, required: true },
      );

      if (result.job.status === "queued") {
        return redirectWith(requestOrigin, "notice", `Production ${action} is waiting for a second administrator's approval.`);
      }
      if (policy.mode === "single-admin-break-glass") {
        await auditEvent(
          "production.single_admin_break_glass_used",
          { jobId: result.job.id, action, commit },
          { principal, outcome: "authorized", request, required: true },
        );
      }
      const dispatched = await dispatchProductionDeployment(result.job, context.store);
      if (!dispatched.claimed || !dispatched.build) {
        return redirectWith(requestOrigin, "notice", `Deployment request already exists with status ${result.job.status}.`);
      }
      await auditEvent(
        `production.${action}_requested`,
        { jobId: result.job.id, commit, releaseBranch: dispatched.immutableBranch, productionBuildUuid: dispatched.build.uuid },
        { principal, outcome: "succeeded", request, required: true },
      );
      return redirectWith(requestOrigin, "notice", `${action === "promote" ? "Promotion" : "Rollback"} build ${dispatched.build.uuid.slice(0, 12)} was queued.`);
    }

    await auditEvent(
      `production.${action}_authorized`,
      { commit: requestedCommit, sourceBuildUuid: buildUuid, domain: config.productionDomain },
      { principal, outcome: "authorized", request },
    );
    if (action === "promote") {
      await requireHealthyPreview(`https://${config.previewDomain}`, requestedCommit);
    } else {
      const previous = await hostinger.getBuild(config.productionDomain, buildUuid);
      const previousCommit = normalizeCommit(previous?.options?.source_options?.commit?.hash);
      if (previous.state !== "completed" || !commitsMatch(requestedCommit, previousCommit)) {
        throw new Error("The selected rollback deployment is not a completed production release.");
      }
    }
    const release = await github.ensureReleaseBranch(requestedCommit);
    const build = await hostinger.startGitBuild({
      domain: config.productionDomain,
      branch: release.branch,
      installationUuid: config.installationUuid,
      owner: config.githubOwner,
      repository: config.githubRepository,
      rootDirectory: ".",
      outputDirectory: "web/.next",
    });
    await auditEvent(
      `production.${action}_requested`,
      { commit: release.sha, releaseBranch: release.branch, sourceBuildUuid: buildUuid, productionBuildUuid: build.uuid },
      { principal, outcome: "succeeded", request },
    );
    return redirectWith(requestOrigin, "notice", `${action === "promote" ? "Promotion" : "Rollback"} build ${build.uuid.slice(0, 12)} was queued.`);
  } catch (error) {
    await auditEvent(
      "production.release_failed",
      { message: error instanceof Error ? error.message : "Unknown error" },
      { principal, outcome: "failed", request },
    );
    return redirectWith(requestOrigin, "error", error instanceof Error ? error.message : String(error));
  }
}
