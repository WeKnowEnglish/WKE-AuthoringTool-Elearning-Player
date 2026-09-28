export type AppReleaseEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_GIT_COMMIT_SHA?: string;
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?: string;
};

/**
 * Release id shown in platform diagnostics.
 * Vercel injects NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA. The managed Hostinger
 * build derives NEXT_PUBLIC_GIT_COMMIT_SHA from the checked-out Git commit.
 */
export function resolveAppReleaseVersion(
  environment: AppReleaseEnvironment = process.env,
): string {
  const generic = environment.NEXT_PUBLIC_GIT_COMMIT_SHA?.trim();
  if (generic) return generic;
  const vercel = environment.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercel) return vercel;
  return "development";
}
