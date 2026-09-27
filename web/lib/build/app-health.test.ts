import { describe, expect, it } from "vitest";
import { createAppHealthPayload } from "./app-health";

describe("app health payload", () => {
  it("reports Docker release metadata", () => {
    expect(
      createAppHealthPayload({
        WKE_APP_VERSION: " 0.1.0 ",
        WKE_GIT_COMMIT_SHA: " abc1234 ",
        NEXT_PUBLIC_GIT_COMMIT_SHA: "public-sha",
        NODE_ENV: "production",
      }),
    ).toEqual({
      status: "ok",
      app: "wke",
      version: "0.1.0",
      commit: "abc1234",
      environment: "production",
    });
  });

  it("uses the existing release fallback outside Docker", () => {
    expect(
      createAppHealthPayload({
        npm_package_version: "0.1.0",
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "vercel-sha",
      }),
    ).toEqual({
      status: "ok",
      app: "wke",
      version: "0.1.0",
      commit: "vercel-sha",
      environment: "development",
    });
  });
});
