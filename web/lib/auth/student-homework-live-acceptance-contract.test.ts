import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("WKE-001 live acceptance harness contract", () => {
  it("runs behind an explicit preflight and opt-in flag", () => {
    const packageJson = source("package.json");
    expect(packageJson).toContain("check-wke-001-live-env.mjs");
    expect(packageJson).toContain("WKE_001_LIVE_ACCEPTANCE=true");
    expect(packageJson).toContain("playwright.wke-001-live.config.ts");
  });

  it("provisions disposable fixtures only after an explicit linked-project confirmation", () => {
    const packageJson = source("package.json");
    const provisioner = source("scripts/provision-wke-001-fixtures.ts");
    expect(packageJson).toContain('"provision:wke-001"');
    expect(provisioner).toContain('const CONFIRM_FLAG = "--confirm-linked-test-project"');
    expect(provisioner).toContain("actualProjectRef !== expectedProjectRef");
    expect(provisioner).toContain("cleanupCreatedRecords");
    expect(provisioner).toContain('process.argv.indexOf("--refresh-homework")');
    expect(provisioner).toContain("refreshableHomeworkName");
    expect(provisioner).toContain("no credentials or record IDs were printed");
    expect(provisioner).not.toMatch(/console\.(?:log|error)\([^\n]*(?:password|pin|username|homeworkId)/i);
  });

  it("disables credential-bearing browser artifacts", () => {
    const config = source("playwright.wke-001-live.config.ts");
    expect(config).toContain('trace: "off"');
    expect(config).toContain('screenshot: "off"');
    expect(config).toContain('video: "off"');
    expect(config).toContain("expect: { timeout: 30_000 }");
  });

  it("loads secrets only from the ignored local environment and never prints values", () => {
    const preflight = source("scripts/check-wke-001-live-env.mjs");
    expect(preflight).toContain('path: ".env.local"');
    expect(preflight).toContain("for (const name of missing)");
    expect(preflight).toContain("for (const name of placeholders)");
    expect(preflight).not.toMatch(/console\.(?:log|error)\([^\n]*process\.env/);
  });

  it("rejects copied placeholders and malformed fixture identifiers before opening a browser", () => {
    const preflight = source("scripts/check-wke-001-live-env.mjs");
    expect(preflight).toContain("Replace these example placeholders");
    expect(preflight).toContain("invalidStudentCredentials");
    expect(preflight).toContain("uuidPattern");
    expect(preflight).toContain("class_homework or teacher_classes UUIDs");
  });

  it("requires explicit non-production confirmation and refuses the production site", () => {
    const preflight = source("scripts/check-wke-001-live-env.mjs");
    expect(preflight).toContain('"purpose-created-non-production"');
    expect(preflight).toContain('hostname === "weknowenglish.online"');
    expect(preflight).toContain('hostname === "www.weknowenglish.online"');
    expect(preflight).toContain("the production site is never an allowed target");
  });

  it("checks every authenticated browser session against the expected Supabase project", () => {
    const spec = source("e2e/wke-001-live-auth.spec.ts");
    expect(spec).toContain('requiredEnv("WKE_001_EXPECTED_SUPABASE_PROJECT_REF")');
    expect(spec).toContain("student session must belong");
    expect(spec).toContain("teacher session must belong");
  });

  it("waits for hydrated login handlers before credentials can be submitted", () => {
    const login = source("components/auth/PortalLoginPanel.tsx");
    const startGate = source("components/primary/HomeworkStartGate.tsx");
    const spec = source("e2e/wke-001-live-auth.spec.ts");
    expect(login).toContain("useClientHydrated");
    expect(login).toContain('data-login-ready={hydrated ? "true" : "false"}');
    expect(login).toContain("disabled={!hydrated || loading}");
    expect(startGate).toContain("useClientHydrated");
    expect(startGate).toContain("disabled={!hydrated}");
    expect(startGate).toContain("data-homework-start-ready");
    expect(spec).toContain("form[data-login-ready=\"true\"]");
    expect(spec).toContain("LOGIN_READY_TIMEOUT_MS = 60_000");
    expect(spec).toContain('waitUntil: "domcontentloaded"');
    expect(spec).toContain("await expect(start).toBeEnabled()");
  });

  it("defers diagnostic upload until authenticated navigation and does not block on mastery sync", () => {
    const login = source("components/auth/PortalLoginPanel.tsx");
    const diagnostics = source("lib/app-diagnostics/client.ts");
    expect(login).toContain("void ensureMasteryHydratedForCurrentStudent()");
    expect(login).not.toContain("flushAppDiagnosticQueue");
    expect(login).not.toContain("await ensureMasteryHydratedForCurrentStudent()");
    expect(login).not.toContain("await pushLocalMasteryBacklogForCurrentStudent()");
    expect(diagnostics).toContain("shouldDeferAppDiagnosticFlush(window.location.pathname)");
    expect(diagnostics).toContain('pathname === "/login"');
  });

  it("retains every named live acceptance row", () => {
    const spec = source("e2e/wke-001-live-auth.spec.ts");
    for (const row of ["P1:", "P2 ", "S1:", "S2 ", "E1:", "E2:", "T1:", "U1 ", "U2 "]) {
      expect(spec).toContain(row);
    }
  });

  it("treats only non-empty alert messages as live journey failures", () => {
    const spec = source("e2e/wke-001-live-auth.spec.ts");
    expect(spec).toContain("async function expectNoAlertMessage");
    expect(spec).toContain(".map((message) => message.trim())");
    expect(spec).not.toContain('expect(page.getByRole("alert")).toHaveCount(0)');
    expect(spec).toContain('.filter({ hasText: "Your sign-in has ended." })');
  });

  it("compares refreshed tokens only as booleans and never attaches their values", () => {
    const spec = source("e2e/wke-001-live-auth.spec.ts");
    expect(spec).toContain("after.access_token !== before.access_token");
    expect(spec).not.toMatch(/(?:console|attach|outputPath).*access_token/);
  });
});
