import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ESL Board Game — We Know English",
  description: "Teacher-controlled classroom board game for ESL practice.",
};

export default function BoardGameLayout({
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
