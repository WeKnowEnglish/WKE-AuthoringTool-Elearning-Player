const API_ORIGIN = "https://developers.hostinger.com";
const BRANCH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/-]{1,255}$/;

export class HostingerApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HostingerApiError";
    this.status = status;
  }
}

function encodePath(value) {
  return encodeURIComponent(String(value));
}

export function normalizeBranch(value) {
  const branch = String(value ?? "").trim();
  if (!BRANCH_PATTERN.test(branch) || branch.endsWith("/") || branch.endsWith(".")) {
    throw new Error("Branch name is invalid.");
  }
  return branch;
}

export function createHostingerClient({ token, username, fetchImplementation = fetch }) {
  if (!token?.trim()) throw new Error("HOSTINGER_API_TOKEN is required.");
  if (!username?.trim()) throw new Error("WKE_HOSTINGER_USERNAME is required.");

  async function request(path, options = {}) {
    const response = await fetchImplementation(`${API_ORIGIN}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
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
        payload && typeof payload === "object"
          ? payload.message || payload.error || `HTTP ${response.status}`
          : `HTTP ${response.status}`;
      throw new HostingerApiError(`Hostinger request failed: ${detail}`, response.status);
    }
    return payload;
  }

  function buildPath(domain, suffix = "") {
    return `/api/hosting/v1/accounts/${encodePath(username)}/websites/${encodePath(domain)}/nodejs/builds${suffix}`;
  }

  return {
    async listBuilds(domain, { page = 1, perPage = 25, states = [] } = {}) {
      const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      for (const state of states) query.append("states[]", state);
      return request(`${buildPath(domain)}?${query}`);
    },

    async getBuild(domain, uuid) {
      return request(buildPath(domain, `/${encodePath(uuid)}`));
    },

    async getBuildLogs(domain, uuid, fromLine = 0) {
      const query = new URLSearchParams({ from_line: String(fromLine) });
      return request(`${buildPath(domain, `/${encodePath(uuid)}/logs`)}?${query}`);
    },

    async startGitBuild({ domain, branch, installationUuid, owner, repository, rootDirectory, outputDirectory }) {
      return request(buildPath(domain), {
        method: "POST",
        body: JSON.stringify({
          node_version: 24,
          app_type: "next",
          root_directory: rootDirectory,
          output_directory: outputDirectory,
          build_script: "build",
          entry_file: null,
          package_manager: "npm",
          source_type: "git",
          source_options: {
            owner,
            repository,
            branch: normalizeBranch(branch),
            installation_uuid: installationUuid,
          },
        }),
      });
    },
  };
}
