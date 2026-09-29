export class HostingerApiError extends Error {
  status: number;
}
export function normalizeBranch(value: unknown): string;
export function createHostingerClient(options: {
  token: string;
  username: string;
  fetchImplementation?: typeof fetch;
}): {
  listBuilds(domain: string, options?: { page?: number; perPage?: number; states?: string[] }): Promise<any>;
  getBuild(domain: string, uuid: string): Promise<any>;
  getBuildLogs(domain: string, uuid: string, fromLine?: number): Promise<any>;
  startGitBuild(options: {
    domain: string;
    branch: string;
    installationUuid: string;
    owner: string;
    repository: string;
    rootDirectory: string;
    outputDirectory: string;
  }): Promise<any>;
};
