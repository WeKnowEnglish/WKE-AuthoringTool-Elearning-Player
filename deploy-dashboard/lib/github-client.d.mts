export class GitHubApiError extends Error {
  status: number;
}
export function normalizeCommit(value: unknown): string;
export function releaseBranchForCommit(commit: string): string;
export function createGitHubClient(options: {
  token: string;
  owner: string;
  repository: string;
  fetchImplementation?: typeof fetch;
}): {
  resolveCommit(commitish: string): Promise<string>;
  ensureReleaseBranch(commitish: string): Promise<{ branch: string; sha: string }>;
};
