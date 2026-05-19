import { resolveLandingRedirectPath } from "@/lib/auth/post-login-path";

export const STUDENT_HOME_PATH = "/home";

/** Skip level landing when the user is already signed in (any role). */
export function shouldSkipLevelLanding(opts: { isAuthenticated: boolean }): boolean {
  return opts.isAuthenticated;
}

export { resolveLandingRedirectPath };
