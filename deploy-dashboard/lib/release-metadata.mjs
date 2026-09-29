const COMMIT_PATTERN = /^[0-9a-f]{7,64}$/i;

export function normalizeCommit(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return COMMIT_PATTERN.test(normalized) ? normalized : undefined;
}

export function selectDashboardCommit({ gitCommit, githubCommit, configuredCommit } = {}) {
  return (
    normalizeCommit(gitCommit) ??
    normalizeCommit(githubCommit) ??
    normalizeCommit(configuredCommit)
  );
}
