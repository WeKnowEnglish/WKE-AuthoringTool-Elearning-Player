import { WhiteboardPilotSession } from "@/components/pilots/whiteboard/WhiteboardPilotSession";

export const metadata = {
  title: "Whiteboard session — Pilot",
  robots: { index: false, follow: false },
};

export default function WhiteboardPilotSessionPage() {
  return <WhiteboardPilotSession />;
}
