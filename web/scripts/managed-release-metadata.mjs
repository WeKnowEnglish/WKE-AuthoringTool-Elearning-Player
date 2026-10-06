const COMMIT_PATTERN = /^[0-9a-f]{7,64}$/i;

export function normalizeManagedCommit(value) {
  const commit = String(value ?? "").trim().toLowerCase();
  return COMMIT_PATTERN.test(commit) ? commit : undefined;
}

export function selectManagedCommit({ githubCommit, gitCommit, configuredCommit, publicCommit }) {
  return (
    normalizeManagedCommit(githubCommit) ??
    normalizeManagedCommit(gitCommit) ??
    normalizeManagedCommit(configuredCommit) ??
    normalizeManagedCommit(publicCommit)
  );
}
