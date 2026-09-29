import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth.mjs";
import { readAdminConfig, readIdentityConfig, type DashboardRole } from "./control-config.mjs";
import { getConfiguredControlStore, type DashboardPrincipal } from "./control-store.mjs";

const ROLE_RANK: Record<DashboardRole, number> = {
  viewer: 0,
  developer: 1,
  administrator: 2,
  owner: 3,
};

export function roleAllows(actual: DashboardRole, required: DashboardRole) {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export async function getCurrentPrincipal(): Promise<DashboardPrincipal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const identity = readIdentityConfig();
  if (identity.oauthConfigured) {
    try {
      const requestHeaders = await headers();
      const principal = await getConfiguredControlStore()?.getSession(token, {
        userAgent: requestHeaders.get("user-agent") || undefined,
      });
      if (principal) return principal;
    } catch (error) {
      console.error("Dashboard session verification failed.", error);
    }
    if (!identity.breakGlassEnabled) return null;
  }

  const admin = readAdminConfig();
  if (!admin.configured || !admin.config.sessionSecret) return null;
  if (!verifySessionToken(token, admin.config.sessionSecret)) return null;
  return {
    id: null,
    login: "legacy-administrator",
    displayName: "Legacy administrator",
    avatarUrl: null,
    role: "owner",
    authMethod: "legacy",
  };
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentPrincipal());
}

export async function requireRole(required: DashboardRole, nextPath = "/deployments") {
  const principal = await getCurrentPrincipal();
  if (!principal) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!roleAllows(principal.role, required)) redirect("/deployments?error=Access%20denied.");
  return principal;
}

export async function requireAdmin(nextPath = "/deployments") {
  return requireRole("viewer", nextPath);
}
