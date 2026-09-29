import type { DashboardRole } from "./control-config.mjs";

export const OAUTH_STATE_COOKIE: string;
export const OAUTH_VERIFIER_COOKIE: string;
export const OAUTH_NEXT_COOKIE: string;
export function safeNextPath(value?: unknown): string;
export function createOAuthTransaction(nextPath?: string): {
  state: string;
  verifier: string;
  challenge: string;
  nextPath: string;
};
export function verifyOAuthState(expected?: string, supplied?: string): boolean;
export function buildGitHubAuthorizationUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): URL;
export function roleForGitHubLogin(roleMap: Record<string, DashboardRole>, login: string): DashboardRole | null;
export function exchangeGitHubCode(options: {
  clientId: string;
  clientSecret: string;
  code: string;
  verifier: string;
  redirectUri: string;
}, fetchImpl?: typeof fetch): Promise<string>;
export function fetchGitHubProfile(accessToken: string, fetchImpl?: typeof fetch): Promise<{
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  two_factor_authentication?: boolean;
}>;
