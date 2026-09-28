export type DeploymentState = "healthy" | "warning" | "routing" | "unavailable" | "misconfigured";

export interface DeploymentStatus {
  name: string;
  origin: string;
  state: DeploymentState;
  message: string;
  checkedAt: string;
  httpStatus: number | null;
  commit: string;
  version: string;
  environment: string;
  releaseReady: boolean;
}

export function normalizeOrigin(value: unknown): string;

export function evaluateHealthResponse(input: {
  name: string;
  origin: string;
  response: Pick<Response, "status" | "ok">;
  payload: unknown;
  checkedAt: string;
}): DeploymentStatus;

export function probeDeployment(input: {
  name: string;
  origin: unknown;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
}): Promise<DeploymentStatus>;
