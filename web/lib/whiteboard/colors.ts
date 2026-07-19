const STUDENT_COLORS = ["#0f766e", "#b45309", "#1d4ed8", "#be123c", "#4338ca", "#047857"];

export function pickStudentColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return STUDENT_COLORS[hash % STUDENT_COLORS.length]!;
}
