/**
 * Where to send someone after leaving / ending a Virtual Classroom session.
 * Guests and unknown sessions still fall back to the join page.
 */
export function resolveVirtualClassroomExitHref(input: {
  role: "host" | "member";
  classId?: string | null;
  /** Preferred hub URL captured when entering the session. */
  returnHref?: string | null;
}): string {
  const explicit = input.returnHref?.trim();
  if (explicit && explicit.startsWith("/") && !explicit.startsWith("//")) {
    return explicit;
  }

  const classId = input.classId?.trim() ?? "";
  if (input.role === "host") {
    if (classId) return `/teacher/classes/${encodeURIComponent(classId)}`;
    return "/teacher/virtual-classroom/host";
  }

  if (classId) {
    // Band-agnostic fallback when join-by-code did not store a portal path.
    return `/primary/class/${encodeURIComponent(classId)}`;
  }

  return "/virtual-classroom/join";
}
