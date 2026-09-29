export function createGitHubAppJwt(options: {
  appId: string;
  privateKey: string;
  now?: number;
}): string;
export function createGitHubAppTokenProvider(options: {
  appId: string;
  privateKey: string;
  installationId: string;
  fetchImplementation?: typeof fetch;
  now?: () => number;
}): () => Promise<string>;
