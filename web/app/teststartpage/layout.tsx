import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick start quiz (test)",
  description: "Experimental full-screen quiz entry for students.",
};

export default function TestStartPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-neutral-900">
      {children}
    </div>
  );
}
