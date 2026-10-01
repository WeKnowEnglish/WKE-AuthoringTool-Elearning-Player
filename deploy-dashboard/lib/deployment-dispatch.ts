import { getControlPlane } from "./control-plane";
import { requireProductionEnvironmentReady } from "./environment-readiness.mjs";
import { normalizeCommit } from "./github-client.mjs";

function commitsMatch(left: string, right: string) {
  return left.startsWith(right) || right.startsWith(left);
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

export async function dispatchPreviewDeployment(job: Record<string, any>, store: any) {
  const claimed = await store.transitionDeploymentJob(job.id, "authorized", "running");
  if (!claimed) return { claimed: false, build: null };
  try {
    const { config, hostinger, github } = getControlPlane();
    const previewRef = await github.ensurePreviewBranch(job.commit_sha);
    const build = await hostinger.startGitBuild({
      domain: config.previewDomain,
      branch: previewRef.branch,
      installationUuid: config.installationUuid,
      owner: config.githubOwner,
      repository: config.githubRepository,
      rootDirectory: ".",
      outputDirectory: "web/.next",
    });
    await store.transitionDeploymentJob(job.id, "running", "running", {
      provider_job_id: build.uuid,
      metadata: { ...job.metadata, immutableBranch: previewRef.branch },
    });
    return { claimed: true, build, immutableBranch: previewRef.branch };
  } catch (error) {
    await store.transitionDeploymentJob(job.id, "running", "failed", {
      error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown dispatch failure",
    });
    throw error;
  }
}

export async function dispatchProductionDeployment(job: Record<string, any>, store: any) {
  const claimed = await store.transitionDeploymentJob(job.id, "authorized", "running");
  if (!claimed) return { claimed: false, build: null };
  try {
    const { config, hostinger, github } = getControlPlane();
    if (job.action === "promote") {
      await Promise.all([
        requireHealthyPreview(`https://${config.previewDomain}`, job.commit_sha),
        requireProductionEnvironmentReady({
          hostinger,
          previewDomain: config.previewDomain,
          productionDomain: config.productionDomain,
        }),
      ]);
    } else if (job.action === "rollback") {
      const sourceBuildUuid = String(job.metadata?.sourceBuildUuid || "");
      if (!sourceBuildUuid) throw new Error("The rollback source build is missing.");
      const previous = await hostinger.getBuild(config.productionDomain, sourceBuildUuid);
      const previousCommit = normalizeCommit(previous?.options?.source_options?.commit?.hash);
      if (previous.state !== "completed" || !commitsMatch(job.commit_sha, previousCommit)) {
        throw new Error("The selected rollback deployment is not a completed production release.");
      }
    } else {
      throw new Error("The production deployment action is invalid.");
    }

    const release = await github.ensureReleaseBranch(job.commit_sha);
    const build = await hostinger.startGitBuild({
      domain: config.productionDomain,
      branch: release.branch,
      installationUuid: config.installationUuid,
      owner: config.githubOwner,
      repository: config.githubRepository,
      rootDirectory: ".",
      outputDirectory: "web/.next",
    });
    await store.transitionDeploymentJob(job.id, "running", "running", {
      provider_job_id: build.uuid,
      metadata: { ...job.metadata, immutableBranch: release.branch },
    });
    return { claimed: true, build, immutableBranch: release.branch };
  } catch (error) {
    await store.transitionDeploymentJob(job.id, "running", "failed", {
      error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown dispatch failure",
    });
    throw error;
  }
}
