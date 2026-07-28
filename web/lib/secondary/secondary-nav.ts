export const SECONDARY_PORTAL_NAV = [
  { id: "home", href: "/secondary", label: "Home" },
  { id: "class", href: "/secondary/class", label: "Class" },
  { id: "learn", href: "/secondary/learn", label: "Learn" },
  { id: "progress", href: "/secondary/progress", label: "Progress" },
] as const;

export type SecondaryPortalNavId = (typeof SECONDARY_PORTAL_NAV)[number]["id"];

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

/** True when Secondary word tray / daily intro should wrap the page. */
export function isSecondaryLearnDeskPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/secondary/learn" ||
    pathname.startsWith("/secondary/match") ||
    pathname.startsWith("/secondary/cloze") ||
    pathname.startsWith("/secondary/spelling") ||
    pathname.startsWith("/secondary/sentence")
  );
}
