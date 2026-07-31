const CASUAL_GREETINGS = ["Hi", "Hello", "Welcome back"] as const;

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPartFromHour(hour: number): DayPart {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function timeOfDayGreeting(dayPart: DayPart): string {
  if (dayPart === "morning") return "Good morning";
  if (dayPart === "afternoon") return "Good afternoon";
  return "Good evening";
}

/**
 * Pick a home greeting once per visit.
 * ~2/3 time-of-day, ~1/3 casual Hi/Hello/Welcome back.
 */
export function buildStudentHomeGreeting(
  displayName: string | null | undefined,
  options?: { hour?: number; random?: number },
): string {
  const hour = options?.hour ?? new Date().getHours();
  const random = options?.random ?? Math.random();
  const name = displayName?.trim() || null;
  const dayPart = dayPartFromHour(hour);

  const base =
    random < 0.67
      ? timeOfDayGreeting(dayPart)
      : CASUAL_GREETINGS[Math.floor(random * 100) % CASUAL_GREETINGS.length]!;

  return name ? `${base}, ${name}` : base;
}
