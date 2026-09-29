import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth.mjs";
import { readAdminConfig } from "./control-config.mjs";

export async function isAdminAuthenticated() {
  const admin = readAdminConfig();
  if (!admin.configured || !admin.config.sessionSecret) return false;
  const cookieStore = await cookies();
  return verifySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
    admin.config.sessionSecret,
  );
}

export async function requireAdmin(nextPath = "/deployments") {
  if (!(await isAdminAuthenticated())) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}
