import { LiveGameJoinForm } from "@/components/live-game/LiveGameJoinForm";

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function LiveGameJoinRoute({ searchParams }: Props) {
  const params = await searchParams;
  return <LiveGameJoinForm initialCode={params.code ?? ""} />;
}
