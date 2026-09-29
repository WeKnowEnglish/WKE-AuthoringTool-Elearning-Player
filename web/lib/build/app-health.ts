import {
  resolveAppReleaseVersion,
  type AppReleaseEnvironment,
} from "./app-release";

export type AppHealthEnvironment = AppReleaseEnvironment & {
  WKE_APP_VERSION?: string;
  WKE_GIT_COMMIT_SHA?: string;
  npm_package_version?: string;
  NODE_ENV?: string;
};

// next.config.ts defines this value at build time. Keeping the direct access at
// module scope lets Next replace it in the server bundle.
const builtCommit = process.env.WKE_BUILD_COMMIT_SHA;

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function createAppHealthPayload(
  environment: AppHealthEnvironment = process.env,
  buildCommit: string | undefined = builtCommit,
) {
  return {
    status: "ok" as const,
    app: "wke" as const,
    version:
      nonEmpty(environment.WKE_APP_VERSION) ??
      nonEmpty(environment.npm_package_version) ??
      "development",
    commit:
      nonEmpty(buildCommit) ??
      nonEmpty(environment.WKE_GIT_COMMIT_SHA) ??
      resolveAppReleaseVersion(environment),
    environment: nonEmpty(environment.NODE_ENV) ?? "development",
  };
}
