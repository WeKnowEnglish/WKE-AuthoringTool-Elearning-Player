import type { AppRole } from "@/lib/auth/roles";

export function requestedLoginRole(
  portal: string | null | undefined,
): AppRole | null {
  const normalized = portal?.trim().toLowerCase();
  if (normalized === "student" || normalized === "teacher") return normalized;
  return null;
}

export function shouldAutoRedirectFromLogin(input: {
  currentRole: AppRole | null;
  requestedPortal: string | null | undefined;
}): boolean {
  if (!input.currentRole) return false;
  const requestedRole = requestedLoginRole(input.requestedPortal);
  return !requestedRole || requestedRole === input.currentRole;
}
