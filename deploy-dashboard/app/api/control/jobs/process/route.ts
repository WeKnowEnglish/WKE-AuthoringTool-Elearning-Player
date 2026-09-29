import { auditEvent } from "../../../../../lib/control-plane";
import { readDeploymentContextConfig } from "../../../../../lib/control-config.mjs";
import { getConfiguredControlStore } from "../../../../../lib/control-store.mjs";
import {
  readWorkerConfig,
  workerRequestAuthorized,
} from "../../../../../lib/deployment-worker-auth.mjs";
import { processDeploymentJobs } from "../../../../../lib/deployment-worker";

export async function POST(request: Request) {
  let worker;
  try {
    worker = readWorkerConfig();
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Worker configuration is invalid." }, { status: 503 });
  }
  if (!worker.configured || !worker.secret) {
    return Response.json({ ok: false, error: "Deployment worker is not configured." }, { status: 503 });
  }
  if (!workerRequestAuthorized(request.headers.get("authorization"), worker.secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const context = readDeploymentContextConfig();
  const store = getConfiguredControlStore();
  if (!context.configured || !context.config.organizationId || !context.config.projectId || !store) {
    return Response.json({ ok: false, error: "Persistent deployment context is not configured." }, { status: 503 });
  }
  const results = await processDeploymentJobs({
    store,
    organizationId: context.config.organizationId,
    projectId: context.config.projectId,
  });
  await auditEvent(
    "deployment.worker_cycle",
    { processed: results.length, results },
    { outcome: results.some((result: any) => result.action === "error") ? "failed" : "succeeded", request, required: true },
  );
  return Response.json({ ok: true, processed: results.length, results });
}
