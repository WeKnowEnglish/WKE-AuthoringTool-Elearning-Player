export class GitHubApiError extends Error {
  status: number;
}
export function normalizeCommit(value: unknown): string;
export function releaseBranchForCommit(commit: string): string;
export function previewBranchForCommit(commit: string): string;
export function createGitHubClient(options: {
  token?: string;
  tokenProvider?: () => Promise<string>;
  owner: string;
  repository: string;
  fetchImplementation?: typeof fetch;
}): {
  resolveCommit(commitish: string): Promise<string>;
  ensurePreviewBranch(commitish: string): Promise<{ branch: string; sha: string }>;
  ensureReleaseBranch(commitish: string): Promise<{ branch: string; sha: string }>;
};
