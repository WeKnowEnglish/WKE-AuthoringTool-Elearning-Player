"use client";

import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/kid-ui/StudentShell";

export function StudentLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") {
    return <>{children}</>;
  }
  return <StudentShell>{children}</StudentShell>;
}
