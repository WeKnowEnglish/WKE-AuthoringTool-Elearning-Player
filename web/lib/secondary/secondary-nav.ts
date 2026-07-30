export const SECONDARY_PORTAL_NAV = [
  { id: "home", href: "/secondary", label: "Home" },
  { id: "learn", href: "/secondary/learn", label: "Learn" },
  { id: "class", href: "/secondary/class", label: "Class" },
  { id: "progress", href: "/secondary/progress", label: "Progress" },
] as const;

export type SecondaryPortalNavId = (typeof SECONDARY_PORTAL_NAV)[number]["id"];

/** Learn section modes — Words study vs Practice quizzes. */
export const SECONDARY_LEARN_SUBNAV = [
  { id: "words", href: "/secondary/learn/words", label: "Words" },
  { id: "practice", href: "/secondary/learn", label: "Practice" },
] as const;

export type SecondaryLearnSubNavId = (typeof SECONDARY_LEARN_SUBNAV)[number]["id"];

/** Home Continue CTA — Match for now; wire smarter next later. */
export const SECONDARY_HOME_CONTINUE_HREF = "/secondary/match";

export function resolveSecondaryPortalNavId(
  pathname: string | null,
): SecondaryPortalNavId {
  if (!pathname) return "home";
  if (pathname === "/secondary" || pathname === "/secondary/") return "home";
  if (pathname === "/secondary/class" || pathname.startsWith("/secondary/class/")) {
    return "class";
  }
  if (pathname.startsWith("/secondary/progress")) return "progress";
  if (
    pathname.startsWith("/secondary/learn") ||
    pathname.startsWith("/secondary/match") ||
    pathname.startsWith("/secondary/cloze") ||
    pathname.startsWith("/secondary/spelling") ||
    pathname.startsWith("/secondary/sentence")
  ) {
    return "learn";
  }
  return "home";
}

export function resolveSecondaryLearnSubNavId(
  pathname: string | null,
): SecondaryLearnSubNavId {
  if (pathname?.startsWith("/secondary/learn/words")) return "words";
  return "practice";
}

export function isSecondaryLearnPracticePath(pathname: string | null): boolean {
  return pathname === "/secondary/learn" || pathname === "/secondary/learn/";
}

export function isSecondaryLearnWordsPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/secondary/learn/words"));
}

/** True when Secondary word tray / daily intro should wrap the page. */
export function isSecondaryLearnDeskPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/secondary/learn" ||
    pathname.startsWith("/secondary/learn/") ||
    pathname.startsWith("/secondary/match") ||
    pathname.startsWith("/secondary/cloze") ||
    pathname.startsWith("/secondary/spelling") ||
    pathname.startsWith("/secondary/sentence")
  );
}
