import { DocumentSessionView } from "@/components/document-activity";

export const metadata = {
  title: "Document activity",
  robots: { index: false, follow: false },
};

export default function TeacherDocumentRoundPage() {
  return <DocumentSessionView />;
}
