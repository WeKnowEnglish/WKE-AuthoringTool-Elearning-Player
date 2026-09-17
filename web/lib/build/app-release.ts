export type AppReleaseEnvironment = {
  NEXT_PUBLIC_GIT_COMMIT_SHA?: string;
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?: string;
};

/**
 * Release id shown in platform diagnostics.
 * Vercel injects NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA. Hostinger does not —
 * set NEXT_PUBLIC_GIT_COMMIT_SHA at build time if you want a real sha.
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
