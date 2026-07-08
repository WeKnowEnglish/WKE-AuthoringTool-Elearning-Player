/** Build a per-student LocalStorage key: `baseKey:studentStorageId`. */
export function scopedLocalStorageKey(baseKey: string, studentStorageId: string): string {
  return `${baseKey}:${studentStorageId}`;
}
