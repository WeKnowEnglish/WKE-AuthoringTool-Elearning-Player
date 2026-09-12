import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(
  resolve(process.cwd(), "lib/actions/student-auth.ts"),
  "utf8",
);
const registrationBody = actionSource.slice(
  actionSource.indexOf("export async function registerStudentAccount"),
  actionSource.indexOf("export async function updateStudentLearningBand"),
);

describe("student registration security contract", () => {
  it("fails closed before creating a service-role client", () => {
    const policyGate = registrationBody.indexOf("!isStudentSelfRegistrationEnabled()");
    const serviceRoleUse = registrationBody.indexOf("createServiceRoleSupabase()");
    expect(policyGate).toBeGreaterThanOrEqual(0);
    expect(serviceRoleUse).toBeGreaterThan(policyGate);
  });

  it("requires shared production rate limiting before service-role account creation", () => {
    const sharedLimiterGate = registrationBody.indexOf("!isUpstashRateLimitConfigured()");
    const rateLimitUse = registrationBody.indexOf("rateLimitAllow(");
    const serviceRoleUse = registrationBody.indexOf("createServiceRoleSupabase()");
    expect(sharedLimiterGate).toBeGreaterThanOrEqual(0);
    expect(rateLimitUse).toBeGreaterThan(sharedLimiterGate);
    expect(serviceRoleUse).toBeGreaterThan(rateLimitUse);
  });

  it("does not expose raw network addresses or usernames in rate-limit keys", () => {
    expect(actionSource).toContain("opaqueRateLimitKey(address)");
    expect(registrationBody).toContain("opaqueRateLimitKey(normalized)");
  });
});
