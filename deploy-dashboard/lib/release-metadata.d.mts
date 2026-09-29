export function normalizeCommit(value: unknown): string | undefined;

export function selectDashboardCommit(values?: {
  gitCommit?: unknown;
  githubCommit?: unknown;
  configuredCommit?: unknown;
}): string | undefined;
