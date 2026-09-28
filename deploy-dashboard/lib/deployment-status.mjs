const DEFAULT_TIMEOUT_MS = 8_000;

export function normalizeOrigin(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Deployment origin is missing.");

  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("Deployment origin must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Deployment origin must not include credentials, a path, query, or fragment.");
  }

  return parsed.origin;
}

function textValue(value, fallback = "Unavailable") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function evaluateHealthResponse({ name, origin, response, payload, checkedAt }) {
  const common = {
    name,
    origin,
    checkedAt,
    httpStatus: response.status,
    commit: "Unavailable",
    version: "Unavailable",
    environment: "Unavailable",
    releaseReady: false,
  };

  if (response.status === 403) {
    return {
      ...common,
      state: "routing",
      message: "Hostinger is reachable, but this hostname is not serving the application.",
    };
  }

  if (response.status === 404) {
    return {
      ...common,
      state: "routing",
      message: "The hostname responded, but the WKE health endpoint was not found.",
    };
  }

  if (!response.ok) {
    return {
      ...common,
      state: "unavailable",
      message: `The health endpoint returned HTTP ${response.status}.`,
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      ...common,
      state: "warning",
      message: "The health endpoint did not return a valid status document.",
    };
  }

  const commit = textValue(payload.commit);
  const version = textValue(payload.version);
  const environment = textValue(payload.environment);
  const hasReleaseCommit = !["Unavailable", "development", "unknown"].includes(commit);
  const isHealthy = payload.status === "ok";
  const isProductionRuntime = environment === "production";
  const releaseReady = isHealthy && isProductionRuntime && hasReleaseCommit;

  if (releaseReady) {
    return {
      ...common,
      state: "healthy",
      message: "The application is healthy and identifies its deployed release.",
      commit,
      version,
      environment,
      releaseReady: true,
    };
  }

  const reason = !isHealthy
    ? `Application status is ${textValue(payload.status, "missing")}.`
    : !isProductionRuntime
      ? `Application environment is ${environment}.`
      : "The application is healthy, but commit metadata is unavailable.";

  return {
    ...common,
    state: "warning",
    message: reason,
    commit,
    version,
    environment,
  };
}

export async function probeDeployment({
  name,
  origin: originValue,
  fetchImplementation = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => new Date(),
}) {
  const checkedAt = now().toISOString();
  let origin;

  try {
    origin = normalizeOrigin(originValue);
  } catch (error) {
    return {
      name,
      origin: String(originValue ?? ""),
      state: "misconfigured",
      message: error instanceof Error ? error.message : String(error),
      checkedAt,
      httpStatus: null,
      commit: "Unavailable",
      version: "Unavailable",
      environment: "Unavailable",
      releaseReady: false,
    };
  }

  try {
    const response = await fetchImplementation(`${origin}/api/health`, {
      cache: "no-store",
      headers: { "user-agent": "wke-deploy-dashboard/0.1" },
      signal: AbortSignal.timeout(timeoutMs),
    });

    let payload = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    }

    return evaluateHealthResponse({ name, origin, response, payload, checkedAt });
  } catch (error) {
    return {
      name,
      origin,
      state: "unavailable",
      message: error instanceof Error ? error.message : String(error),
      checkedAt,
      httpStatus: null,
      commit: "Unavailable",
      version: "Unavailable",
      environment: "Unavailable",
      releaseReady: false,
    };
  }
}
