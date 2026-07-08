"use client";

import { usePathname } from "next/navigation";
import { StudentStorageBootstrap } from "@/components/auth/StudentStorageBootstrap";
import { StudentShell } from "@/components/kid-ui/StudentShell";

export function StudentLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bareChrome =
    pathname === "/" || pathname === "/home" || pathname === "/secondary/login";

  if (bareChrome) {
    return (
      <>
        <StudentStorageBootstrap />
        {children}
      </>
    );
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
      <StudentStorageBootstrap />
      {children}
    </StudentShell>
  );
}
