"use client";

import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/kid-ui/StudentShell";

export function StudentLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/home") {
    return <>{children}</>;
  }
  const wide = pathname.startsWith("/grammar");
  const onSecondary = pathname === "/secondary" || pathname.startsWith("/secondary/");
  return (
    <StudentShell
      wide={wide}
      compact={wide}
      hidePrimaryNav={onSecondary}
      homeHref={onSecondary ? "/secondary" : "/home"}
    >
      {children}
    </StudentShell>
  );
}
