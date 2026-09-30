import { timingSafeEqual } from "node:crypto";

export function readWorkerConfig(environment = process.env) {
  const secret = environment.WKE_DEPLOY_WORKER_SECRET?.trim();
  if (secret && secret.length < 32) throw new Error("WKE_DEPLOY_WORKER_SECRET must contain at least 32 characters.");
  return { configured: Boolean(secret), secret };
}

export function workerRequestAuthorized(authorizationHeader, secret) {
  const supplied = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : "";
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(secret);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
