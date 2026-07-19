import { VirtualClassroomSessionGate } from "@/components/virtual-classroom/VirtualClassroomSessionView";

export const metadata = {
  title: "Virtual Classroom",
  robots: { index: false, follow: false },
};

export default function TeacherVirtualClassroomSessionPage() {
  return <VirtualClassroomSessionGate />;
}
