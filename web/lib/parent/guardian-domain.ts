import { createHash, randomBytes } from "node:crypto";

export const GUARDIAN_INVITATION_TTL_DAYS = 7;

export type GuardianRelationshipType = "parent" | "guardian";
export type GuardianInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";
export type GuardianRelationshipStatus = "active" | "revoked";

export function normalizeGuardianEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidGuardianEmail(value: string): boolean {
  const email = normalizeGuardianEmail(value);
  if (email.length < 3 || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isGuardianRelationshipType(
  value: string,
): value is GuardianRelationshipType {
  return value === "parent" || value === "guardian";
}

export function createGuardianInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashGuardianInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function guardianInvitationExpiresAt(
  now = new Date(),
  ttlDays = GUARDIAN_INVITATION_TTL_DAYS,
): string {
  const safeDays = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 1;
  return new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000).toISOString();
}

export function isPlausibleGuardianInvitationToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,80}$/.test(token);
}
