const API_ORIGIN = "https://api.github.com";
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;

export class GitHubApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export function normalizeCommit(value) {
  const commit = String(value ?? "").trim().toLowerCase();
  if (!COMMIT_PATTERN.test(commit)) throw new Error("Commit SHA is invalid.");
  return commit;
}

export function releaseBranchForCommit(commit) {
  return `wke-release/${normalizeCommit(commit).slice(0, 12)}`;
}

export function previewBranchForCommit(commit) {
  return `wke-preview/${normalizeCommit(commit).slice(0, 12)}`;
}

export function createGitHubClient({ token, tokenProvider, owner, repository, fetchImplementation = fetch }) {
  if (!token?.trim() && typeof tokenProvider !== "function") {
    throw new Error("A GitHub token or token provider is required.");
  }
  if (!owner?.trim() || !repository?.trim()) throw new Error("GitHub repository is required.");

  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;

  async function request(path, options = {}) {
    const requestToken = typeof tokenProvider === "function" ? await tokenProvider() : token;
    const response = await fetchImplementation(`${API_ORIGIN}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${requestToken}`,
        "x-github-api-version": "2022-11-28",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
      signal: options.signal ?? AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && payload.message
          ? payload.message
          : `HTTP ${response.status}`;
      throw new GitHubApiError(`GitHub request failed: ${detail}`, response.status);
    }
    return payload;
  }

  async function resolveCommit(commitish) {
    const payload = await request(`${repositoryPath}/commits/${encodeURIComponent(commitish)}`);
    return normalizeCommit(payload.sha);
  }

  async function ensureImmutableBranch(commitish, branchForCommit) {
    const sha = await resolveCommit(commitish);
    const branch = branchForCommit(sha);
    try {
      await request(`${repositoryPath}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
      });
    } catch (error) {
      if (!(error instanceof GitHubApiError) || error.status !== 422) throw error;
      const existing = await request(
        `${repositoryPath}/git/ref/heads/${encodeURIComponent(branch)}`,
      );
      const existingSha = normalizeCommit(existing?.object?.sha);
      if (existingSha !== sha) {
        throw new GitHubApiError("Existing immutable branch points to another commit.", 409);
      }
    }
    return { branch, sha };
  }

  return {
    resolveCommit,

    async ensurePreviewBranch(commitish) {
      return ensureImmutableBranch(commitish, previewBranchForCommit);
    },

    async ensureReleaseBranch(commitish) {
      return ensureImmutableBranch(commitish, releaseBranchForCommit);
    },
  };
}
