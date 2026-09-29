import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin } from "../../../../lib/auth.mjs";
import { auditEvent, getAuthorizedProjectContext, getControlPlane } from "../../../../lib/control-plane";
import { getCurrentPrincipal, roleAllows } from "../../../../lib/dashboard-auth";
import { dispatchPreviewDeployment } from "../../../../lib/deployment-dispatch";
import { deploymentIdempotencyKey, normalizeRequestId } from "../../../../lib/deployment-policy.mjs";

function redirectWith(requestOrigin: string, key: "notice" | "error", message: string) {
  const url = new URL("/deployments", requestOrigin);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const principal = await getCurrentPrincipal();
  if (!principal) return new Response("Unauthorized", { status: 401 });
  if (!roleAllows(principal.role, "developer")) return new Response("Forbidden", { status: 403 });
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const form = await request.formData();
    const branch = String(form.get("branch") || "");
    const { config, hostinger, github } = getControlPlane();

    if (principal.authMethod === "github") {
      const context = await getAuthorizedProjectContext(principal, "developer");
      const requestId = normalizeRequestId(form.get("requestId"));
      const commit = await github.resolveCommit(branch);
      const result = await context.store.createDeploymentJob({
        organizationId: context.organizationId,
        projectId: context.projectId,
        requestedBy: principal.id!,
        environment: "preview",
        previewSlotKey: "shared",
        action: "build",
        status: "authorized",
        sourceBranch: branch,
        commitSha: commit,
        idempotencyKey: deploymentIdempotencyKey({ projectId: context.projectId, requestId }),
        metadata: { requestId, domain: config.previewDomain },
      });
      if (!result.created) {
        return redirectWith(requestOrigin, "notice", `Deployment request already exists with status ${result.job.status}.`);
      }
      await auditEvent(
        "preview.job_created",
        { jobId: result.job.id, branch, commit, domain: config.previewDomain },
        { principal, outcome: "authorized", request, required: true },
      );
      const dispatched = await dispatchPreviewDeployment(result.job, context.store);
      if (!dispatched.claimed || !dispatched.build) {
        return redirectWith(requestOrigin, "notice", "The preview request was already claimed by another worker.");
      }
      await auditEvent(
        "preview.build_requested",
        { jobId: result.job.id, commit, previewBranch: dispatched.immutableBranch, buildUuid: dispatched.build.uuid },
        { principal, outcome: "succeeded", request, required: true },
      );
      return redirectWith(requestOrigin, "notice", `Preview build ${dispatched.build.uuid.slice(0, 12)} was queued.`);
    }

    await auditEvent(
      "preview.build_authorized",
      { branch, domain: config.previewDomain },
      { principal, outcome: "authorized", request },
    );
    const previewRef = await github.ensurePreviewBranch(branch);
    const build = await hostinger.startGitBuild({
      domain: config.previewDomain,
      branch: previewRef.branch,
      installationUuid: config.installationUuid,
      owner: config.githubOwner,
      repository: config.githubRepository,
      rootDirectory: ".",
      outputDirectory: "web/.next",
    });
    await auditEvent(
      "preview.build_requested",
      { sourceBranch: branch, commit: previewRef.sha, previewBranch: previewRef.branch, buildUuid: build.uuid },
      { principal, outcome: "succeeded", request },
    );
    return redirectWith(requestOrigin, "notice", `Preview build ${build.uuid.slice(0, 12)} was queued.`);
  } catch (error) {
    await auditEvent(
      "preview.build_failed",
      { message: error instanceof Error ? error.message : "Unknown error" },
      { principal, outcome: "failed", request },
    );
    return redirectWith(requestOrigin, "error", error instanceof Error ? error.message : String(error));
  }
}
