import { WhiteboardPilotSession } from "@/components/collaborative-whiteboard";

export const metadata = {
  title: "Whiteboard",
  robots: { index: false, follow: false },
};

export default function StudentWhiteboardSessionPage() {
  return <WhiteboardPilotSession />;
}
