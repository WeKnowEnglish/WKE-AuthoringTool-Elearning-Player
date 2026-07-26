export function teacherSpacePublicPath(handle: string): string {
  return `/wke/${encodeURIComponent(handle)}`;
}

export function teacherSpacePlayPath(handle: string, itemId: string): string {
  return `/wke/${encodeURIComponent(handle)}/play/${encodeURIComponent(itemId)}`;
}

export function teacherSpaceSettingsPath(): string {
  return "/teacher/classes?space=1";
}
