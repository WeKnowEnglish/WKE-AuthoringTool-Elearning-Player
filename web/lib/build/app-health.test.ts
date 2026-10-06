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

  it("prefers the exact build commit over stale runtime metadata", () => {
    expect(
      createAppHealthPayload(
        {
          WKE_GIT_COMMIT_SHA: "7c2fd586e970b79d3cf84c515da8dad6279a714d",
          NEXT_PUBLIC_GIT_COMMIT_SHA: "7c2fd586e970b79d3cf84c515da8dad6279a714d",
          NODE_ENV: "production",
        },
        "72cff398c01f23dfdc7dba60c8ba3e5178205ae0",
      ),
    ).toMatchObject({
      commit: "72cff398c01f23dfdc7dba60c8ba3e5178205ae0",
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
