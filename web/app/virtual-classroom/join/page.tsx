import { VirtualClassroomJoinClient } from "@/components/virtual-classroom/VirtualClassroomJoinClient";

export const metadata = {
  title: "Join Virtual Classroom",
  robots: { index: false, follow: false },
};

export default function VirtualClassroomJoinPage() {
  return <VirtualClassroomJoinClient />;
}
