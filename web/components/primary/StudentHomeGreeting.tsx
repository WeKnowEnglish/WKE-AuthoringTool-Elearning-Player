"use client";

import { useEffect, useState } from "react";
import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import { buildStudentHomeGreeting } from "@/lib/primary/student-home-greeting";

type Props = {
  id?: string;
  className?: string;
};

/**
 * Animated home greeting — time-of-day or casual, with the student's name.
 * Text is chosen client-side after mount to avoid SSR hydration mismatch.
 */
export function StudentHomeGreeting({ id, className }: Props) {
  const { displayName, ready } = useStudentDisplayName();
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setGreeting(buildStudentHomeGreeting(displayName));
  }, [displayName, ready]);

  return (
    <h1
      id={id}
      className={`${className ?? ""} ${
        greeting ? "student-home-greeting-in" : "opacity-0"
      }`.trim()}
    >
      {greeting ?? "Hello"}
    </h1>
  );
}
