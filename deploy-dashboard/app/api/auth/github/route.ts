import { NextResponse } from "next/server";

import { getRequestOrigin } from "../../../../lib/auth.mjs";
import { readIdentityConfig } from "../../../../lib/control-config.mjs";
import {
  buildGitHubAuthorizationUrl,
  createOAuthTransaction,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "../../../../lib/github-oauth.mjs";

export async function GET(request: Request) {
  const identity = readIdentityConfig();
  if (!identity.oauthConfigured || !identity.config.githubClientId) {
    return new Response("GitHub administrator sign-in is not configured.", { status: 503 });
  }

  let origin: string;
  try {
    origin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const requestUrl = new URL(request.url);
  const transaction = createOAuthTransaction(requestUrl.searchParams.get("next") || "/deployments");
  const redirectUri = new URL("/api/auth/github/callback", origin).toString();
  const authorizationUrl = buildGitHubAuthorizationUrl({
    clientId: identity.config.githubClientId,
    redirectUri,
    state: transaction.state,
    challenge: transaction.challenge,
  });
  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set(OAUTH_STATE_COOKIE, transaction.state, cookieOptions);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, transaction.verifier, cookieOptions);
  response.cookies.set(OAUTH_NEXT_COOKIE, transaction.nextPath, cookieOptions);
  return response;
}
