import { SecondaryChrome } from "@/components/secondary/SecondaryChrome";
import { SecondaryPracticeLayout } from "@/components/secondary/learn/SecondaryPracticeLayout";

export default function SecondaryPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SecondaryChrome>
      <SecondaryPracticeLayout>{children}</SecondaryPracticeLayout>
    </SecondaryChrome>
  );
}
