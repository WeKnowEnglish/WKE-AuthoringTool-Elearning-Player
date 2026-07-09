import { SecondaryPracticeLayout } from "@/components/secondary/learn/SecondaryPracticeLayout";

export default function SecondaryPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SecondaryPracticeLayout>{children}</SecondaryPracticeLayout>;
}
