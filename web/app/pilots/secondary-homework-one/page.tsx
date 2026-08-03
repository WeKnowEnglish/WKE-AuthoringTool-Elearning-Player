import { SecondaryHomeworkOneShell } from "@/components/secondary/SecondaryHomeworkOneShell";

export const metadata = {
  title: "Secondary Homework One | Pilots",
  robots: { index: false, follow: false },
};

export default function SecondaryHomeworkOnePilotPage() {
  return (
    <main className="min-h-dvh bg-neutral-100 px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SecondaryHomeworkOneShell />
      </div>
    </main>
  );
}
