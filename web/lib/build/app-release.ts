export type AppReleaseEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_GIT_COMMIT_SHA?: string;
};

/**
 * Release id shown in platform diagnostics.
 * The managed build derives NEXT_PUBLIC_GIT_COMMIT_SHA from the checked-out Git commit.
 */
export function resolveAppReleaseVersion(
  environment: AppReleaseEnvironment = process.env,
): string {
  const generic = environment.NEXT_PUBLIC_GIT_COMMIT_SHA?.trim();
  if (generic) return generic;
  return "development";
}
