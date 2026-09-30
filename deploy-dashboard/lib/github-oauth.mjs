import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const OAUTH_STATE_COOKIE = "wke_deploy_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "wke_deploy_oauth_verifier";
export const OAUTH_NEXT_COOKIE = "wke_deploy_oauth_next";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function safeNextPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/deployments";
}

export function createOAuthTransaction(nextPath = "/deployments") {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { state, verifier, challenge, nextPath: safeNextPath(nextPath) };
}

export function verifyOAuthState(expected, supplied) {
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function buildGitHubAuthorizationUrl({ clientId, redirectUri, state, challenge }) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("allow_signup", "false");
  return url;
}

export function roleForGitHubLogin(roleMap, login) {
  return roleMap?.[String(login || "").toLowerCase()] || null;
}

export async function exchangeGitHubCode(
  { clientId, clientSecret, code, verifier, redirectUri },
  fetchImpl = fetch,
) {
  const response = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error("GitHub did not accept the sign-in request.");
  }
  return payload.access_token;
}

export async function fetchGitHubProfile(accessToken, fetchImpl = fetch) {
  const response = await fetchImpl("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "wke-deploy-dashboard",
    },
    signal: AbortSignal.timeout(10_000),
  });
  const profile = await response.json();
  if (!response.ok || !Number.isInteger(profile.id) || !profile.login) {
    throw new Error("GitHub identity could not be verified.");
  }
  return profile;
}
