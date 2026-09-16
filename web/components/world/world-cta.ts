import { studentLoginPath } from "@/lib/auth/student-login";
import type { WorldSelection } from "./world-landmasses";

export type WorldCta = {
  href: string | null;
  label: string;
  disabled: boolean;
};

const SIGN_IN_LABEL: Record<string, string> = {
  "Go to class": "Sign in to start",
  "Read stories": "Sign in to read",
  "Play games": "Sign in to play",
  "See your pet": "Sign in to see your pet",
  "Walk around": "Sign in to walk around",
};

export function worldCta(selection: WorldSelection, signedIn: boolean): WorldCta | null {
  if (selection.locked) {
    return { href: null, label: "Coming soon", disabled: true };
  }
  if (!selection.href || !selection.ctaLabel) return null;
  if (signedIn) {
    return { href: selection.href, label: selection.ctaLabel, disabled: false };
  }
  return {
    href: studentLoginPath("a1", selection.href),
    label: SIGN_IN_LABEL[selection.ctaLabel] ?? "Sign in",
    disabled: false,
  };
}
