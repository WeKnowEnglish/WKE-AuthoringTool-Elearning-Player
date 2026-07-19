import { WhiteboardPilotLanding } from "@/components/pilots/whiteboard/WhiteboardPilotLanding";

export const metadata = {
  title: "Collaborative Whiteboard — Pilot",
  description: "Teacher-controlled ESL whiteboard pilot",
  robots: { index: false, follow: false },
};

export default function WhiteboardPilotPage() {
  return <WhiteboardPilotLanding />;
}
