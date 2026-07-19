import { WhiteboardPilotSession } from "@/components/collaborative-whiteboard";

export const metadata = {
  title: "Class whiteboard",
  robots: { index: false, follow: false },
};

export default function TeacherWhiteboardSessionPage() {
  return <WhiteboardPilotSession />;
}
