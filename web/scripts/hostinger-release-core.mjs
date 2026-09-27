const MIN_COMMIT_LENGTH = 7;
const MAX_COMMIT_LENGTH = 64;

export function normalizeDeploymentOrigin(value) {
  const origin = String(value ?? "").trim().replace(/\/$/, "");
  if (!origin) {
    throw new Error("WKE_DEPLOYMENT_ORIGIN is required.");
  }
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/") {
    throw new Error("WKE_DEPLOYMENT_ORIGIN must be an HTTPS origin without a path.");
  }
  return parsed.origin;
}

export function normalizeCommit(value) {
  const commit = String(value ?? "").trim().toLowerCase();
  if (
    commit.length < MIN_COMMIT_LENGTH ||
    commit.length > MAX_COMMIT_LENGTH ||
    !/^[0-9a-f]+$/.test(commit)
  ) {
    throw new Error("WKE_EXPECTED_GIT_COMMIT_SHA must be a 7-64 character hexadecimal commit SHA.");
  }
  return commit;
}

export function commitsMatch(expected, observed) {
  const normalizedExpected = normalizeCommit(expected);
  const normalizedObserved = normalizeCommit(observed);
  return (
    normalizedExpected.startsWith(normalizedObserved) ||
    normalizedObserved.startsWith(normalizedExpected)
  );
}

export function evaluateReleaseHealth(payload, expectedCommit) {
  if (!payload || typeof payload !== "object") {
    return { ready: false, reason: "health response is not a JSON object" };
  }
  if (payload.status !== "ok") {
    return { ready: false, reason: `health status is ${String(payload.status ?? "missing")}` };
  }
  if (payload.environment !== "production") {
    return {
      ready: false,
      reason: `application environment is ${String(payload.environment ?? "missing")}`,
    };
  }
  if (!payload.commit || payload.commit === "development" || payload.commit === "unknown") {
    return { ready: false, reason: "release commit metadata is unavailable" };
  }

  try {
    if (!commitsMatch(expectedCommit, payload.commit)) {
      return {
        ready: false,
        reason: `live commit ${String(payload.commit)} does not match ${expectedCommit}`,
      };
    }
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  return { ready: true, reason: "expected release is healthy" };
}

