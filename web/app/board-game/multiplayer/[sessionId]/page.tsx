import { BoardGameSessionPage } from "@/components/board-game/live/BoardGameSessionPage";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function BoardGameMultiplayerSessionPage({ params }: Props) {
  const { sessionId } = await params;
  return <BoardGameSessionPage sessionId={sessionId} />;
}
