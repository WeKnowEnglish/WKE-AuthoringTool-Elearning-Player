import { BoardGameJoinForm } from "@/components/board-game/live/BoardGameJoinForm";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function BoardGameJoinCodePage({ params }: Props) {
  const { code } = await params;
  return <BoardGameJoinForm initialCode={code} />;
}
