export function safeParentPath(
  value: string | null | undefined,
  fallback = "/parent",
): string {
  const path = value?.trim() ?? "";
  if (
    (path !== "/parent" && !path.startsWith("/parent/")) ||
    path.startsWith("//")
  ) {
    return fallback;
  }
  return path;
}

export function parentStudentPath(
  studentId: string,
  tab: "stream" | "progress" = "stream",
): string {
  return `/parent/students/${encodeURIComponent(studentId)}/${tab}`;
}
