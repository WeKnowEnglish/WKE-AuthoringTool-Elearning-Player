import { StudentLayoutClient } from "@/components/kid-ui/StudentLayoutClient";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayoutClient>{children}</StudentLayoutClient>;
}
