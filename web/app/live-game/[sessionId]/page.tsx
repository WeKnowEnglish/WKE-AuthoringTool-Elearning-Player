import { LiveGameSessionPage } from "@/components/live-game/LiveGameSessionPage";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function LiveGameSessionRoute({ params }: Props) {
  const { sessionId } = await params;
  return <LiveGameSessionPage sessionId={sessionId} />;
}
