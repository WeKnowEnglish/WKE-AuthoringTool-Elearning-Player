import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin } from "../../../../lib/auth.mjs";
import { auditEvent, getControlPlane } from "../../../../lib/control-plane";
import { isAdminAuthenticated } from "../../../../lib/dashboard-auth";
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
  if (!(await isAdminAuthenticated())) return new Response("Unauthorized", { status: 401 });
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const form = await request.formData();
    const action = String(form.get("action") || "");
    const requestedCommit = normalizeCommit(form.get("commit"));
    const buildUuid = String(form.get("buildUuid") || "");
    if (!['promote', 'rollback'].includes(action)) throw new Error("Release action is invalid.");

    const { config, hostinger, github } = getControlPlane();
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
    auditEvent(`production.${action}_requested`, {
      commit: release.sha,
      releaseBranch: release.branch,
      sourceBuildUuid: buildUuid,
      productionBuildUuid: build.uuid,
      domain: config.productionDomain,
    });
    return redirectWith(
      requestOrigin,
      "notice",
      `${action === "promote" ? "Promotion" : "Rollback"} build ${build.uuid.slice(0, 12)} was queued.`,
    );
  } catch (error) {
    return redirectWith(requestOrigin, "error", error instanceof Error ? error.message : String(error));
  }
}
