import { SentenceStripSession } from "@/components/sentence-strip/SentenceStripSession";

export const metadata = {
  title: "Sentence strip",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ sessionId: string }> };

export default async function SentenceStripSessionPage({ params }: Props) {
  const { sessionId } = await params;
  return <SentenceStripSession sessionId={sessionId.toUpperCase()} />;
}
