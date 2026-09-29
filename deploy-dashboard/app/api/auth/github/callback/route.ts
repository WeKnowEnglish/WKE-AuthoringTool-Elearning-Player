import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRequestOrigin, SESSION_COOKIE_NAME } from "../../../../../lib/auth.mjs";
import { readDeploymentContextConfig, readIdentityConfig } from "../../../../../lib/control-config.mjs";
import { getConfiguredControlStore } from "../../../../../lib/control-store.mjs";
import {
  exchangeGitHubCode,
  fetchGitHubProfile,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  roleForGitHubLogin,
  safeNextPath,
  verifyOAuthState,
} from "../../../../../lib/github-oauth.mjs";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function loginFailure(origin: string, code: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url, 303);
}

function clearOAuthCookies(response: NextResponse, secure: boolean) {
  for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE]) {
    response.cookies.set(name, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  }
}

export async function GET(request: Request) {
  let origin: string;
  try {
    origin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const identity = readIdentityConfig();
  const store = getConfiguredControlStore();
  if (
    !identity.oauthConfigured ||
    !identity.config.githubClientId ||
    !identity.config.githubClientSecret ||
    !store
  ) {
    return new Response("GitHub administrator sign-in is not configured.", { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const secureCookies = origin.startsWith("https:");
  const cookieStore = await cookies();
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;
  const nextPath = safeNextPath(cookieStore.get(OAUTH_NEXT_COOKIE)?.value);
  if (!code || !verifier || !verifyOAuthState(expectedState, state || undefined)) {
    const response = loginFailure(origin, "oauth_state");
    clearOAuthCookies(response, secureCookies);
    return response;
  }

  try {
    const redirectUri = new URL("/api/auth/github/callback", origin).toString();
    const accessToken = await exchangeGitHubCode({
      clientId: identity.config.githubClientId,
      clientSecret: identity.config.githubClientSecret,
      code,
      verifier,
      redirectUri,
    });
    const profile = await fetchGitHubProfile(accessToken);
    const role = roleForGitHubLogin(identity.config.roleMap, profile.login);
    const missingRequiredMfa =
      identity.config.requireGitHub2FA && profile.two_factor_authentication !== true;
    if (!role || missingRequiredMfa) {
      await store.appendAuditEvent({
        actorLogin: profile.login,
        name: "auth.github_denied",
        outcome: "denied",
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "unknown",
        metadata: { reason: missingRequiredMfa ? "github_2fa_required" : "login_not_allowlisted" },
      });
      const response = loginFailure(origin, "not_authorized");
      clearOAuthCookies(response, secureCookies);
      return response;
    }

    const user = await store.upsertGitHubUser(profile, role);
    if (!user?.id) throw new Error("The dashboard user record could not be created.");
    const deploymentContext = readDeploymentContextConfig();
    if (deploymentContext.configured && deploymentContext.config.organizationId) {
      await store.ensureMembership({
        organizationId: deploymentContext.config.organizationId,
        userId: String(user.id),
        role,
      });
    }
    const session = await store.createSession(String(user.id), {
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    await store.appendAuditEvent({
      actorUserId: user.id,
      actorLogin: profile.login,
      name: "auth.github_succeeded",
      outcome: "succeeded",
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: { role },
    });

    const response = NextResponse.redirect(new URL(nextPath, origin), 303);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      secure: secureCookies,
      sameSite: "strict",
      path: "/",
      maxAge: session.maxAge,
    });
    clearOAuthCookies(response, secureCookies);
    return response;
  } catch (error) {
    console.error("GitHub administrator sign-in failed.", error);
    const response = loginFailure(origin, "oauth_failed");
    clearOAuthCookies(response, secureCookies);
    return response;
  }
}
