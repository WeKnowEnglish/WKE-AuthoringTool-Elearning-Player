import { SentenceStripJoinClient } from "@/components/sentence-strip/SentenceStripJoinClient";

export const metadata = {
  title: "Join sentence strip",
  robots: { index: false, follow: false },
};

export default function SentenceStripJoinPage() {
  return <SentenceStripJoinClient />;
}
