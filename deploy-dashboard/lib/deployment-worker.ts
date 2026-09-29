import { getControlPlane } from "./control-plane";
import { dispatchPreviewDeployment, dispatchProductionDeployment } from "./deployment-dispatch";

export async function processDeploymentJobs({ store, organizationId, projectId }: any) {
  const jobs = await store.listActiveDeploymentJobs({ organizationId, projectId });
  const results = [];
  const { config, hostinger } = getControlPlane();
  for (const job of jobs) {
    try {
      if (job.status === "authorized") {
        const dispatch = job.environment === "preview"
          ? await dispatchPreviewDeployment(job, store)
          : await dispatchProductionDeployment(job, store);
        results.push({ id: job.id, action: dispatch.claimed ? "dispatched" : "already-claimed" });
        continue;
      }
      if (job.status === "running" && job.provider_job_id) {
        const domain = job.environment === "preview" ? config.previewDomain : config.productionDomain;
        const providerBuild = await hostinger.getBuild(domain, job.provider_job_id);
        if (providerBuild.state === "completed") {
          await store.transitionDeploymentJob(job.id, "running", "succeeded");
          results.push({ id: job.id, action: "succeeded" });
        } else if (providerBuild.state === "failed") {
          await store.transitionDeploymentJob(job.id, "running", "failed", {
            error_message: "Hostinger reported that the build failed.",
          });
          results.push({ id: job.id, action: "failed" });
        } else {
          results.push({ id: job.id, action: "running" });
        }
      }
    } catch (error) {
      results.push({ id: job.id, action: "error", message: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return results;
}
